import express = require('express');
import http = require("http");
import bodyParser = require('body-parser')
import {PassportConfig} from "./passport/passport-config"

// Create Express server
export const app = express();
export var httpPort = normalizePort(process.env.PORT || 3030);

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

//let jwtsecret = process.env.JWT_SECRET || "secret"
let authenticationRouter = express.Router();              // get an instance of the express Router
export let passportConfig=new PassportConfig();
authenticationRouter.post('/login', passportConfig.login);
authenticationRouter.post('/isSessionValid', passportConfig.isSessionValid);
authenticationRouter.post('/logout', passportConfig.logout);

app.set("port", httpPort);
app.use("/api/auth", authenticationRouter);

export let httpServer = http.createServer(app);
httpServer.on('error', onError)
httpServer.on("listening", onListening);

function normalizePort(val) {
    var port = parseInt(val, 10);
    if (isNaN(port)) {return val;}
    if (port >= 0) {return port;}
    return false;
}

function onListening() {
    var addr = httpServer.address();
    var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
    console.log("AUTHN_SERV: Listening on " + bind);
}

function onError(error) {
    if (error.syscall !== "listen") {
        throw error;
    }
    console.error(error);

    //var bind = typeof port === "string"
    throw error;
    /*
      var bind = typeof port === "string"
        ? "Pipe " + port
        : "Port " + port;

      // handle specific listen errors with friendly messages
      switch (error.code) {
        case "EACCES":
          console.error(bind + " requires elevated privileges");
          process.exit(1);
          break;
        case "EADDRINUSE":
          console.error(bind + " is already in use");
          process.exit(1);
          break;
        default:
          throw error;
      }*/
}

/**
 * Event listener for HTTP server "listening" event.
 */
