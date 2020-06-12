export class QConnCfg {
    host: string;
    port: number;
    user: string;
    password: string;
    socketNoDelay: boolean;
    socketTimeout: number;
    constructor(cfg: any) {
        this.host = ("host" in cfg) ? cfg["host"] : "localhost";
        if (~"port" in cfg) {
            throw new Error("No port found in cfg file");
        }
        this.port = cfg["port"];
        this.user = ("user" in cfg) ? cfg["user"] : "";
        this.password = ("password" in cfg) ? cfg["password"] : "";
        this.socketNoDelay = ("socketNoDelay" in cfg) ? cfg["socketNoDelay"] : false;
        this.socketTimeout = ("socketTimeout" in cfg) ? cfg["socketTimeout"] : 0;
    }
}