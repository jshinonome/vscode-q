import { window } from "vscode";
import * as q from "node-q";
import { homedir } from "os";
import * as fs from "fs";
import { QConn } from "./q-conn";

export class QConnManager {
    qConnPool = new Map<string, QConn>();
    qCfg: any;

    constructor() {
        this.loadCfg();
    }

    getConn(name: string) {
        return this.qConnPool.get(name);
    }

    connect(name: string) {
        try {
            let qConn = this.getConn(name);
            if (qConn) {
                q.connect(qConn,
                    (err, conn) => {
                        if (err) window.showWarningMessage(err.message);
                        if (conn) {
                            window.showInformationMessage(`Connected to '${name}'`);
                            qConn?.setConn(conn);
                        }
                    }
                );
            }
        } catch (error) {
            window.showErrorMessage(`Failed to connect to '${name}', please check q-server-cfg.json`);
        }
    }

    loadCfg() {
        // read the q server configuration file from home dir
        this.qCfg = JSON.parse(fs.readFileSync(homedir() + '/.vscode/q-server-cfg.json', 'utf8'));
        this.qCfg.forEach((element: QConn) => {
            this.qConnPool.set(element["name"], new QConn(element));
        });
    }
}