import jwt = require('jsonwebtoken');
import passport = require('passport')
import passportJwt = require('passport-jwt')
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {InternalService} from "./internalServiceInterface"
import {ExternalService} from "./externalServiceInterface"
import {MongoInterface} from "./mongoInterface"
import * as Messages from '../messages';
import { TokenGenerator, TokenBase } from 'ts-token-generator';
import {PassportStatic} from "passport";

import {EventEmitter} from "events";
type loginFuncionI = (username: string, password: string) => Observable < Object >
type isSessionValidFuncionI = (tokenInfo:any) => Observable < Object >
export class PassportConfig {
    jwtsecret = process.env.JWT_SECRET || "secret"
    internalService = new InternalService();
    externalService = new ExternalService();
    mongoInterface = new MongoInterface();
    clientJwtOptions = {
        jwtFromRequest: passportJwt.ExtractJwt.fromBodyField("jwt"),
        secretOrKey: this.jwtsecret,
    };
    serviceJwtOptions = {
        jwtFromRequest: passportJwt.ExtractJwt.fromHeader("jwt"),
        secretOrKey: this.jwtsecret,
    };
    servicePassport;
    clientPassport;
    logoutPassport;
    requireClientJwtAuth;
    requireServiceJwtAuth;
    logoutJwtAuth
    isSessionValid;
    logout;
    tokgen = new TokenGenerator({ bitSize: 512, baseEncoding: TokenBase.BASE62 });

    constructor(){
        this.servicePassport = new passport.Passport();
        this.clientPassport  = new passport.Passport();
        this.logoutPassport  = new passport.Passport();
        this.servicePassport.use(new passportJwt.Strategy(this.serviceJwtOptions, this.checkJwtToken))
        this.clientPassport.use(new passportJwt.Strategy(this.clientJwtOptions,this.checkJwtToken));
        this.logoutPassport.use(new passportJwt.Strategy(this.clientJwtOptions,this.logoutByJwtToken));
        this.requireClientJwtAuth = this.clientPassport.authenticate('jwt', {session: false})
        this.requireServiceJwtAuth = this.servicePassport.authenticate('jwt', {session: false})
        this.logoutJwtAuth = this.logoutPassport.authenticate('jwt', {session: false})
        this.isSessionValid = [this.enterPointCheckServiceJwtToken,this.wrapValidationServiceJwt,this.requireClientJwtAuth,this.wrapValidationClientJwt]
        this.logout = [this.logoutJwtAuth,this.wrapLogout]
    }

    wrapValidationServiceJwt = function (req,res,next) {
        if(!req.user) return next();
        if (req.user.status == 'valid') return next();
        else {
            if(req.user.status == 'not valid')
                res.status(401).json(Messages.errorNoData);
            else
                res.status(401).json(Messages.wrapError(req.user.reason));}
    }

    wrapValidationClientJwt = function (req,res,next) {
        if (req.user.status == 'valid') res.json(Messages.wrapValidateSuccess( {}));
        else {
            if(req.user.status == 'not valid')
                res.status(403).json(Messages.errorNoData);
            else
                res.status(403).json(Messages.wrapError(req.user.reason));}
    }

    wrapLogout = function (req,res,next) {
        if (req.user.status != 'success') {res.status(403).json(Messages.wrapError(req.user.reason));}
        else res.json({logout:{status:'success'}});
    }

    login=(req, res)=> {
        if (!req.body ) {
            res.status(400).json(Messages.errorInvalidJson);
            return
        }
        if (!req.body.username) {
            res.status(400).json(Messages.errorInvalidJson);
            return
        }
        this.mongoInterface.CheckCredentials(req.body.username).subscribe((resCheckCredentials)=> {
            if(resCheckCredentials=='success') {
                switch (req.body.system) {
                    case 'INTERNAL_SERVICE': {
                        this.processLoginResult(this.internalService.login$, req, res);
                        return;
                    }
                    case 'TEST_EXTERNAL_SERVICE': {
                        this.processLoginResult(this.externalService.login$, req, res);
                        return;
                    }
                    default: {
                        res.status(403).json(Messages.errorLoginSystemNotSupported);
                        break;
                    }
                }
            }else{
                res.status(401).json(Messages.errorWrongLoginCredentials);
                return
            }
            return
        })

    }

    private processIsSessionValidResult(login$: isSessionValidFuncionI, tokenInfo):Observable<Object> {
        return login$(tokenInfo).take(1)
    }

    private processLoginResult(login$: loginFuncionI, req, res) {
            login$(req.body.username, req.body.password).take(1).subscribe(
                successResult => {
                    let sessionToken=this.tokgen.generate();
                    let sessionTokenInfo={
                        token:sessionToken,
                        tokenExpires: new Date().toISOString(),
                        service: req.body.system,
                        username: req.body.username,
                        domain: 'INT'
                    };
                    this.mongoInterface.addSession(req.body.username,sessionTokenInfo).subscribe(()=>{
                        let token = this.createJWT(req.body.system, successResult,sessionTokenInfo, req.body.extraInfo); //здесь создается JWT
                        res.json({jwt: token});
                    },(err)=>{res.status(500).json(err);});

                },
                err => {
                    res.status(500).json(err);
                })
        }

    createJWT(system: string,
              tokenInfo: any,
              sessionTokenInfo: any,
              extraInfo?: any) {
        if (!extraInfo) extraInfo = {}
        extraInfo.loginTimestamp = new Date().toISOString();

        return jwt.sign({
            system: system,
            tokenInfo: tokenInfo,
            sessionTokenInfo: sessionTokenInfo,
            extraInfo: extraInfo
        }, this.jwtsecret)
    }

    public GetHostAddresses(){
        return Observable.create((observer)=>{
            this.mongoInterface.GetHostAddresses().subscribe((res)=>{
                res.forEach((setting)=>{
                    console.log('AUTHN_SERV: setting.' + setting.name+' = '+JSON.stringify(setting.address));
                    if(setting.name=='INTERNAL_SERVICE'){
                        this.internalService.setAddress(setting.address.hostname,setting.address.port);
                    }
                    if(setting.name=='TEST_EXTERNAL_SERVICE'){
                        this.externalService.setAddress(setting.address.hostname,setting.address.port);
                    }
                })
                observer.next();
            })
        })
    }

    checkJwtToken=(payload, done)=> {
        if (!!payload) {
            let obs:Observable<Object>;
            if(payload.system=='TEST_EXTERNAL_SERVICE') obs=this.externalService.isSessionValid$(payload.tokenInfo);
            if(payload.system=='INTERNAL_SERVICE') obs=this.internalService.isSessionValid$(payload.tokenInfo)
            obs//.take(1)
                .subscribe(res=> {
                    if(res['status']=='valid') {
                        this.mongoInterface.isSessionValid(payload.sessionTokenInfo.username, payload.sessionTokenInfo).subscribe(
                            (res) => {
                                if (res == 'success') return done(null, Messages.wrapValidateSuccess({}))
                                else {
                                    return done(null, Messages.wrapValidateFail({}))
                                }
                            }, (err) => {
                                return done(null, Messages.wrapValidateFail({}))
                            }
                        ), (err) => {
                            return done(null, Messages.wrapValidateFail({}))
                        }
                    } else return done(null, Messages.wrapValidateFail({}))
                },err=>{done(null, Messages.wrapValidateFail({}))});
        }
        else {
            return done(null, Messages.errorInvalidToken)
        }
    }

    logoutByJwtToken=(payload, done)=> {
        if (!!payload) {
            this.mongoInterface.isSessionValid(payload.sessionTokenInfo.username, payload.sessionTokenInfo).subscribe((res)=> {
                if(res=='success')
                    this.mongoInterface.clearSession(payload.sessionTokenInfo.username, payload.sessionTokenInfo).subscribe(
                        (res) => {
                            if (res == 'success') {
                                let obs:Observable<Object>;
                                if(payload.system=='TEST_EXTERNAL_SERVICE') obs=this.externalService.logout$(payload.tokenInfo);
                                if(payload.system=='INTERNAL_SERVICE') obs=this.internalService.logout$(payload.tokenInfo);
                                obs.subscribe((res)=>{
                                    if(res['status']=='success') return done(null, {status: "success"})
                                    else return done(null, {status: "fail"});
                                },(err)=>{return done(null, {status: "fail"})})
                            }
                            else return done(null, {status: "fail"})
                        }
                    )
                else return done(null, Messages.errorNoData)
            })
        }
        else {
            return done(null, Messages.errorInvalidToken)
        }
    }

    enterPointCheckServiceJwtToken=(req,res,next)=>{
        if(!req.headers.jwt) next();
        else return this.requireServiceJwtAuth(req,res,next);
    }
}