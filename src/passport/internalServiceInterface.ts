import http = require("http");
import {BehaviorSubject, Observable} from 'rxjs'
import * as Messages from "../messages";

type IntServiceToken = {
    id: string,
    token: string,
    tokenExpires: string
}
type IntServiceRequestData = {
    method: string, host: string, port: number, path: string, intServiceToken?: IntServiceToken, data?: Object
}

export class InternalService {
    currentHost;
    currentPort;

    constructor(host?,port?){
        this.currentHost=host;
        this.currentPort=port;
    }

    setAddress(host: string, port: string) {
        this.currentHost = host
        this.currentPort = port
    }

    login$=(username: string, password: string): Observable<Object>=> {
        return this.intServiceRequest$({
            method: 'POST',
            host: this.currentHost,
            port: this.currentPort,
            path: "/users/login",
            data: {username: username, password: password}
        })
            .concatMap((intServiceLoginResult: any) => {
                if (!!intServiceLoginResult.token) {
                    return Observable.of(intServiceLoginResult)
                }
                else {

                    if (!!intServiceLoginResult.error && (intServiceLoginResult.error == 403 || intServiceLoginResult.error == 'not-found')) {
                        return Observable.throw(Messages.errorWrongLoginCredentials)
                    }
                    else {
                        return Observable.throw(Messages.errorUnexpectedLoginError)
                    }
                }
            })
    }

    isSessionValid$=(tokenInfo): Observable<Object>=> {
        return this.intServiceRequest$({
            method: 'POST',
            host: this.currentHost,
            port: this.currentPort,
            path: "/users/isSessionValid",
            data: {token: tokenInfo.token, id: tokenInfo.id,tokenExpires: tokenInfo.tokenExpires}
        })
            .concatMap((intServiceLoginResult: any) => {
                if (!!intServiceLoginResult.status) {
                    return Observable.of(intServiceLoginResult)
                }
                else {
                    if (!!intServiceLoginResult.error && (intServiceLoginResult.error == 403 || intServiceLoginResult.error == 'not-found')) {
                        return Observable.throw(Messages.errorWrongLoginCredentials)
                    }
                    else {
                        return Observable.throw(Messages.errorUnexpectedValidationError)
                    }
                }
            })
    }

    logout$=(tokenInfo): Observable<Object>=> {
        return this.intServiceRequest$({
            method: 'POST',
            host: this.currentHost,
            port: this.currentPort,
            path: "/users/logout",
            data: {token: tokenInfo.token, id: tokenInfo.id,tokenExpires: tokenInfo.tokenExpires}
        })
            .concatMap((intServiceLoginResult: any) => {
                if (!!intServiceLoginResult.status) {
                    return Observable.of(intServiceLoginResult)
                }
                else {
                    if (!!intServiceLoginResult.error && (intServiceLoginResult.error == 403 || intServiceLoginResult.error == 'not-found')) {
                        return Observable.throw(Messages.errorWrongLoginCredentials)
                    }
                    else {
                        return Observable.throw(Messages.errorUnexpectedValidationError)
                    }
                }
            })
    }

    private intServiceRequest$(intServiceRequestData: IntServiceRequestData): Observable<Object> {
        return Observable.create((observer) => {
            let options = {
                "method": intServiceRequestData.method,
                "hostname": intServiceRequestData.host,
                "port": intServiceRequestData.port,
                "path": intServiceRequestData.path,
                "headers": {
                    "Content-Type": "application/json"
                }
            };
            if (!!intServiceRequestData.intServiceToken) Object.assign(options.headers, {"Authorization": `Bearer ${intServiceRequestData.intServiceToken.token}`})
            let req = http.request(options, (res) => {
                let chunks = [];

                res.on("data", (chunk) => {
                    chunks.push(chunk);
                });

                res.on("error", (error) => {
                    observer.error(error);
                    observer.complete();
                });
                res.on("end", () => {
                    var body = Buffer.concat(chunks);
                    let result
                    try {
                        if (body.toString().startsWith('Internal Server Error')) observer.error("INVALID_TOKEN")
                        else {
                            result = JSON.parse(body.toString())
                            /*if (!!result.userprofiles&&isArray(result.userprofiles)&&result.userprofiles.length==1) {
                                console.log("emit",result.userprofiles)
                               observer.next(result.userprofiles[0])
                            }
                            else
                               observer.error("INVALID_USER_PROFILE")

                            }*/
                            observer.next(result);
                        }
                    } catch (error) {
                        observer.error(Messages.errorInvalidJson)
                    }
                    observer.complete();
                });
            });
            if (!!intServiceRequestData.data) req.write(JSON.stringify(intServiceRequestData.data));

            req.end();
        })
    }
}