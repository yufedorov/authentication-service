import {httpServer, httpPort, passportConfig} from "./app-base";
import http = require("http");
import * as PassportConfig from "./passport/passport-config";
passportConfig.GetHostAddresses().subscribe(()=>{
    httpServer.listen(3030)
});

