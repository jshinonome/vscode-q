import { window } from "vscode";
import * as q from "node-q";
import { homedir } from "os";
import * as fs from "fs";
import { QConnCfg } from "./q-conn-cfg"

export class QConnManager {
    qConnPool = new Map<string, q.Connection>();
    qCfg: any;

    constructor() {
        this.loadCfg();
    }

    getConn(name: string) {
        if (this.qConnPool) {
            return this.qConnPool.get(name);
        } else {

        }

    }

    connect(name: string) {
        try {
            let cfg = new QConnCfg(this.qCfg[name]);
            if (cfg) {
                q.connect(cfg,
                    (err, con) => {
                        if (err) window.showWarningMessage(err.message);
                        if (con) {
                            window.showInformationMessage(`connected to '${name}'`);
                            this.qConnPool.set(name, con);
                        }
                    }
                );
            }
        } catch (error) {
            window.showErrorMessage(`Failed to load configuration for process '${name}'`);
        }
    }

    loadCfg() {
        // read the q server configuration file from home dir
        fs.readFile(homedir() + '/.vscode/q-server-cfg.json', 'utf8',
            (err, jsonString) => {
                if (err) {
                    window.showErrorMessage("Failed to open configure file");
                }
                this.qCfg = JSON.parse(jsonString);
                console.log(this.qCfg);
            }
        )
    }
}