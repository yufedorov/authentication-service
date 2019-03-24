import { } from 'jasmine';
import http = require("http");
//import * as assert from 'assert';
//import { expect } from 'chai';
import * as chai from 'chai';
//import * as chaiHttp from 'chai-http';
import { } from 'mocha';
import * as supertest from 'supertest'
//let expect=chai.expect;
//chai.use(chaiHttp)
import {app,httpServer,passportConfig} from '../src/app-base';
import{ mongoUnitStart,mongoUnitStop,instanceInternalService,instanceExternalService} from '@yufedorov/auth-mongo-unit';
let authServer=httpServer;
let internalServer = instanceInternalService;
let externalServer = instanceExternalService;
let request = supertest.agent(authServer);
let intServiceJwt='';
let extServiceJwt='';
let user1InternalJwt='';
let user1ExternalJwt='';
let user2InternalJwt='';

describe("ModelEnvironment", function () {
    after(function () {
        console.log('\n-------After all-------');
        authServer.close();
        internalServer.close();
        externalServer.close();
        mongoUnitStop().subscribe(()=>{
            console.log('\n-------Mongo Unit Stopped-------');
            process.exit();//только так удалось стопнуть тест
        });
    });
    this.timeout(60000);
    before((done) => {
        console.log('-------Before all-------')
        mongoUnitStart().filter((done) => done).take(1).subscribe((flag)=>{
            passportConfig.GetHostAddresses().subscribe(()=>{
                authServer.listen(3030)
                done()
            });
        })
    })

    it('/api/auth/login - не тот system', (done) => {
        console.log('-------Begin test-------\n')
        request.post('/api/auth/login').send({
            system: 'meteor',
            username:'mganl1',
            password:'mganl1'
        })//.set('Accept', 'application/json')
            .end((err,res)=>{
                if(res.status==403&&
                    res.body.status=='error'&&
                    res.body.reason=='LOGIN_SYSTEM_NOT_SUPPORTED')done();
            });
    });
    it('/api/auth/login - пустая data', (done) => {
        request.post('/api/auth/login').end((err,res)=>{
            if(res.status==400&&
                res.body.status=='error'&&
                res.body.reason=='INVALID_JSON')done();
        });
    });
    it('/api/auth/login - не верный метод', (done) => {
        request.post('/login').end((err,res)=>{
            if(res.status==404)done();
        });
    });

    it('/api/auth/login - InternalService логинится через int_user в TestExternalService', (done) => {
        request.post('/api/auth/login').send(
            {
                system: 'TEST_EXTERNAL_SERVICE',
                username:'int_user',
                password:'int_user'
            }).end((err,res)=>{
            //console.log(res);
            if(!err&&res.status==200){
                if(!!res.body.jwt){
                    intServiceJwt=res.body.jwt;
                    done();
                }
            }
        });
    });
    it('/api/auth/login - ExternalService логинится через test_ext_user в InternalService', (done) => {
        request.post('/api/auth/login').send(
            {
                system: 'INTERNAL_SERVICE',
                username:'test_ext_user',
                password:'test_ext_user'
            }).end((err,res)=>{
            //console.log(res);
            if(!err&&res.status==200){
                if(!!res.body.jwt){
                    extServiceJwt=res.body.jwt;
                    done();
                }
            }
        });
    });
    it('/api/auth/login - Пользователь1 логинится в INTERNAL_SERVICE', (done) => {
        request.post('/api/auth/login').send(
            {
                system: 'INTERNAL_SERVICE',
                username:'mganl1',
                password:'mganl1'
            })
            .end((err,res)=>{
                if(!err&&res.status==200){
                    if(!!res.body.jwt){
                        user1InternalJwt=res.body.jwt;
                        done();}
                }
            });
    });
    it('/api/auth/login - Пользователь1 логинится в TEST_EXTERNAL_SERVICE', (done) => {
        request.post('/api/auth/login').send(
            {
                system: 'TEST_EXTERNAL_SERVICE',
                username:'mganl1',
                password:'mganl1'
            })
            .end((err,res)=>{
                if(!err&&res.status==200){
                    if(!!res.body.jwt){
                        user1ExternalJwt=res.body.jwt;
                        done();}
                }
            });
    });
    it('/api/auth/login - Пользователь2 логинится в INTERNAL_SERVICE', (done) => {
        request.post('/api/auth/login').send(
            {
                system: 'INTERNAL_SERVICE',
                username:'mganl2',
                password:'mganl2'
            })
            .end((err,res)=>{
                if(!err&&res.status==200){
                    if(!!res.body.jwt){
                        user2InternalJwt=res.body.jwt;
                        done();}
                }
            });
    });
    it('/api/auth/isSessionValid - InternalService проверяет валидность своей сессии, как клиент', (done) => {
        request.post('/api/auth/isSessionValid').send(
            {
                jwt: intServiceJwt
            }).end((err,res)=>{
            if(!err&&res.status==200){
                if(res.body.status=='valid'){
                    done();
                }
            }
        });
    });
    it('/api/auth/isSessionValid - InternalService проверяет валидность своей сессии, как сервис', (done) => {
        request.post('/api/auth/isSessionValid')
            .send({jwt: intServiceJwt})
            .set({jwt: intServiceJwt})
            .end((err,res)=>{
                if(!err&&res.status==200){
                    if(res.body.status=='valid'){done();}
                }
            });
    });
    it('/api/auth/isSessionValid - InternalService проверяет валидность сессии Пользователя1 в INTERNAL_SERVICE', (done) => {
        request.post('/api/auth/isSessionValid')
            .send({jwt: user1InternalJwt})
            .set({jwt: intServiceJwt})
            .end((err,res)=>{
                if(!err&&res.status==200){
                    if(res.body.status=='valid'){done();}
                }
            });
    });
    it('/api/auth/isSessionValid - InternalService проверяет валидность сессии Пользователя1 в TEST_EXTERNAL_SERVICE', (done) => {
        request.post('/api/auth/isSessionValid')
            .send({jwt: user1ExternalJwt})
            .set({jwt: intServiceJwt})
            .end((err,res)=>{
                if(!err&&res.status==200){
                    if(res.body.status=='valid'){done();}
                }
            });
    });
    it('/api/auth/isSessionValid - InternalService проверяет валидность сессии Пользователя2 в INTERNAL_SERVICE', (done) => {
        request.post('/api/auth/isSessionValid')
            .send({jwt: user2InternalJwt})
            .set({jwt: intServiceJwt})
            .end((err,res)=>{
                if(!err&&res.status==200){
                    if(res.body.status=='valid'){done();}
                }
            });
    });
    it('/api/auth/logout - Пользователь1 выполняет logout из INTERNAL_SERVICE', (done) => {
        request.post('/api/auth/logout')
            .send({jwt: user1InternalJwt})
            .end((err,res)=>{
                if(!err&&res.status==200){
                    if(res.body.logout.status=='success'){done();}
                }
            });
    });
    it('/api/auth/logout - Пользователь1 выполняет logout повторно из INTERNAL_SERVICE', (done) => {
        request.post('/api/auth/logout')
            .send({jwt: user1InternalJwt})
            .end((err,res)=>{
                if(!err&&res.status==403&&
                    res.body.status=='error'&&
                    res.body.reason=='NO_DATA'){
                    done();
                }
            });
    });
    it('/api/auth/logout - Пользователь1 c неккоректным Jwt выполняет logout повторно из INTERNAL_SERVICE', (done) => {
        request.post('/api/auth/logout')
            .send({jwt: user1InternalJwt+123})
            .end((err,res)=>{
                if(!err&&res.status==401){
                    done();
                }
            });
    });
    it('/api/auth/isSessionValid - InternalService проверяет валидность сессии Пользователя1 в INTERNAL_SERVICE', (done) => {
        request.post('/api/auth/isSessionValid')
            .send({jwt: user1InternalJwt})
            .set({jwt: intServiceJwt})
            .end((err,res)=>{
                if(!err&&
                    res.status==403&&
                    res.body.status=='error'&&
                    res.body.reason=='NO_DATA')
                {
                    done();
                }
            });
    });
    it('/api/auth/isSessionValid - InternalService снова проверяет валидность сессии Пользователя1 в TEST_EXTERNAL_SERVICE', (done) => {
        request.post('/api/auth/isSessionValid')
            .send({jwt: user1ExternalJwt})
            .set({jwt: intServiceJwt})
            .end((err,res)=>{
                if(!err&&res.status==200){
                    if(res.body.status=='valid'){done();}
                }
            });
    });
    it('/api/auth/login - Пользователь1 снова логинится в INTERNAL_SERVICE', (done) => {
        request.post('/api/auth/login').send(
            {
                system: 'INTERNAL_SERVICE',
                username:'mganl1',
                password:'mganl1'
            })
            .end((err,res)=>{
                if(!err&&res.status==200){
                    if(!!res.body.jwt){
                        user1InternalJwt=res.body.jwt;
                        done();}
                }
            });
    });
    it('/api/auth/isSessionValid - InternalService снова проверяет валидность сессии Пользователя1 в INTERNAL_SERVICE', (done) => {
        request.post('/api/auth/isSessionValid')
            .send({jwt: user1InternalJwt})
            .set({jwt: intServiceJwt})
            .end((err,res)=>{
                if(!err&&res.status==200){
                    if(res.body.status=='valid'){done();}
                }
            });
    });
    it('/api/auth/isSessionValid - InternalService c некорректным Jwt проверяет валидность сессии Пользователя1 в INTERNAL_SERVICE', (done) => {
        request.post('/api/auth/isSessionValid')
            .send({jwt: user1InternalJwt})
            .set({jwt: intServiceJwt+'123'})
            .end((err,res)=>{
                if(!err&&res.status==401){
                    done();
                }
            });
    });
    it('/api/auth/logout - InternalService выполняет logout из TEST_EXTERNAL_SERVICE', (done) => {
        request.post('/api/auth/logout')
            .send({jwt: intServiceJwt})
            .end((err,res)=>{
                if(!err&&res.status==200){
                    if(res.body.logout.status=='success'){done();}
                }
            });
    });
    it('/api/auth/isSessionValid - проверяем валидность удаленного Jwt для InternalService', (done) => {
        request.post('/api/auth/isSessionValid')
            .send({jwt: intServiceJwt})
            .end((err,res)=>{
                if(!err&&res.status==403&&
                    res.body.status=='error'&&
                    res.body.reason=='NO_DATA')
                {
                    done();
                }
            });
    });
    it('/api/auth/isSessionValid - InternalService пытается проверить валидность сессии Пользователя1 в TEST_EXTERNAL_SERVICE', (done) => {
        request.post('/api/auth/isSessionValid')
            .send({jwt: user1ExternalJwt})
            .set({jwt: intServiceJwt})
            .end((err,res)=>{
                //console.log(res);
                if(!err&&res.status==401&&
                    res.body.status=='error'&&
                    res.body.reason=='NO_DATA')
                {
                    done();
                }
            });
    });
    it('/api/auth/logout - ExternalService выполняет logout из INTERNAL_SERVICE', (done) => {
        request.post('/api/auth/logout')
            .send({jwt: extServiceJwt})
            .end((err,res)=>{
                if(!err&&res.status==200){
                    if(res.body.logout.status=='success'){done();}
                }
            });
    });
})