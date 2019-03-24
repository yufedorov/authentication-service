import {BehaviorSubject, Observable} from "rxjs";
import * as MongoClient from "mongodb";

export class MongoInterface{
    mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/test';//"mongodb://karadag.borlas.ru:27137/nsrTest";//
    mongoClient: MongoClient.MongoClient

    MongoClientConnect(){
        return Observable.create((observer)=> {
            if (!this.mongoClient || !this.mongoClient.isConnected()) {
                MongoClient.connect(this.mongoUrl, (err, client) => {
                    if (err) observer.error(err)
                    this.mongoClient = client;
                    observer.next()
                })
            } else {
                observer.next()
            }
        })
    }



    public CheckCredentials(username,password?){
        return Observable.create((observer)=>{
            console.log('AUTHN_SERV: Connect to Mongo - CheckCredentials');
            let obs=this.MongoClientConnect();
            obs.subscribe(()=>{
                let db=this.mongoClient.db();
                db.collection('user_profiles')
                    .findOne({username: username}, (err, userProfile) => {
                        let res='success';
                        if(!userProfile) res='fail'//throw 'Setting '+username+' is not found';
                        if(err) observer.error(err)
                        console.log('AUTHN_SERV: user_profile.' + username+' = '+res);
                        observer.next(res);
                    });
            })
        })
    }

    public addSession(username,sessionTokenInfo){
        return Observable.create((observer)=> {
            console.log('AUTHN_SERV: Connect to Mongo - AddSession');
            this.MongoClientConnect().subscribe(() => {
                const db = this.mongoClient.db();
                db.collection('user_sessions').findOne({username: username}, (err, arg) => {
                    if (err) observer.error(err);
                    if (!!arg) {
                        db.collection('user_sessions').updateOne({username: username}, {$push: {sessions: sessionTokenInfo}}, (err, arg) => {
                            if (err) observer.error(err);
                            if (arg.result.ok=1) {
                                console.log('AUTHN_SERV: Push session' + JSON.stringify({username: username}) + JSON.stringify({sessions: sessionTokenInfo}));
                                observer.next('success');
                            }else{
                                observer.next('fail');
                            }
                        })
                    } else {
                        db.collection('user_sessions').insertOne(
                            {
                                username: username,
                                sessions: [sessionTokenInfo]
                            }, (err, arg) => {
                                if (err) throw err;
                                if (arg.result.ok=1) {
                                    console.log('AUTHN_SERV: Insert session' + JSON.stringify({username: username}) + JSON.stringify({sessions: sessionTokenInfo}));
                                    observer.next('success');
                                }else{
                                    observer.next('fail');
                                }
                            }
                        )
                    }
                })
            })
        })
    }

    public clearSession(username,sessionTokenInfo){
        return Observable.create((observer)=> {
            console.log('AUTHN_SERV: Connect to Mongo - clearSession');
            this.MongoClientConnect().subscribe(() => {
                const db = this.mongoClient.db();
                db.collection('user_sessions').findOne({username: username}, (err, arg) => {
                    if (err) throw err;
                    if (!!arg) {
                        db.collection('user_sessions').updateOne({username: username}, {$pull: {sessions: sessionTokenInfo}}, (err, arg) => {
                            console.log('AUTHN_SERV: Pull session' + JSON.stringify({username: username}) + JSON.stringify({$pull: {sessions: sessionTokenInfo}}));
                            if (err) if(err) observer.error(err);
                            if (arg.result.ok == 1) {
                                observer.next('success');
                            }
                            else{
                                observer.next('fail');
                            }
                        })
                    } else {
                        observer.next('fail');
                    }
                })
            })
        })
    }

    public isSessionValid(username,sessionTokenInfo){
        return Observable.create((observer)=>{
            console.log('AUTHN_SERV: Connect to Mongo - isSessionValid:'+JSON.stringify({username:username,sessions:sessionTokenInfo}));
            this.MongoClientConnect().subscribe(()=> {
                const db = this.mongoClient.db();
                db.collection('user_sessions').findOne({username:username,sessions:sessionTokenInfo},(err,arg)=>{
                    if(err) observer.error(err);
                    if(!!arg){
                        observer.next('success');
                    }else{
                        observer.next('fail');
                    }
                })
            })
        })
    }

    public GetHostAddresses(){
        return Observable.create((observer)=>{
            let res=[];
            console.log('AUTHN_SERV: Connect to Mongo - GetInternalServiceAddress');
            let obs=this.MongoClientConnect();
            obs.subscribe(()=>{
                let db=this.mongoClient.db();
                db.collection('settings')
                    .findOne({name: 'INTERNAL_SERVICE'}, (err, setting) => {
                        if(!setting) throw 'Setting INTERNAL_SERVICE is empty';
                        if(err) observer.error(err)
                        res.push(setting)
                        db.collection('settings')
                            .findOne({name: 'TEST_EXTERNAL_SERVICE'}, (err, setting) => {
                                if(!setting) throw 'Setting TEST_EXTERNAL_SERVICE is empty';
                                if(err) observer.error()
                                res.push(setting)
                                observer.next(res);
                            });
                    })

            })
        })
    }
}