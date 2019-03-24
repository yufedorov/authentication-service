import http = require("http");
import {BehaviorSubject, Observable} from 'rxjs'
import * as Messages from "../messages";

type ExtServiceToken = {
    id: string,
    token: string,
    tokenExpires: string
}
type ExtServiceRequestData = {
    method: string, host: string, port: number, path: string, extServiceToken?: ExtServiceToken, data?: Object
}

export class ExternalService {
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
        return this.extServiceRequest$({
            method: 'POST',
            host: this.currentHost,
            port: this.currentPort,
            path: "/test_ext_svc/login",
            data: {username: username, password: password}
        })
            .concatMap((extServiceLoginResult: any) => {
                if (!!extServiceLoginResult.token) {
                    return Observable.of(extServiceLoginResult)
                }
                else {

                    if (!!extServiceLoginResult.error && (extServiceLoginResult.error == 403 || extServiceLoginResult.error == 'not-found')) {
                        return Observable.throw(Messages.errorWrongLoginCredentials)
                    }
                    else {
                        return Observable.throw(Messages.errorUnexpectedLoginError)
                    }
                }
            })
    }

    isSessionValid$=(tokenInfo): Observable<Object>=> {
        return this.extServiceRequest$({
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
        return this.extServiceRequest$({
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

    private extServiceRequest$(extServiceRequestData: ExtServiceRequestData): Observable<Object> {
        return Observable.create((observer) => {

            let options = {
                "method": extServiceRequestData.method,
                "hostname": extServiceRequestData.host,
                "port": extServiceRequestData.port,
                "path": extServiceRequestData.path,
                "headers": {
                    "Content-Type": "application/json"
                }
            };
            if (!!extServiceRequestData.extServiceToken) Object.assign(options.headers, {"Authorization": `Bearer ${extServiceRequestData.extServiceToken.token}`})
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
            if (!!extServiceRequestData.data) req.write(JSON.stringify(extServiceRequestData.data));

            req.end();
        })
    }
}