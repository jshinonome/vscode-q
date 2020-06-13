/* eslint-disable quotes */
import { window } from "vscode";
import * as q from "node-q";
import { homedir } from "os";
import * as fs from "fs";
import { QConn } from "./q-conn";

export class QConnManager {
    qConnPool = new Map<string, QConn>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    qCfg: any;
    activeConn: q.Connection | undefined;

    constructor() {
        this.loadCfg();
    }

    getConn(name: string): QConn | undefined {
        return this.qConnPool.get(name);
    }

    connect(name: string): void {
        try {
            const qConn = this.getConn(name);
            if (qConn) {
                const conn = qConn.conn;
                if (conn) {
                    this.activeConn = conn;
                } else {
                    q.connect(qConn,
                        (err, conn) => {
                            if (err) window.showWarningMessage(err.message);
                            if (conn) {
                                window.showInformationMessage(`Connected to '${name}'`);
                                qConn?.setConn(conn);
                                this.activeConn = conn;
                            }
                        }
                    );
                }
            }
        } catch (error) {
            window.showErrorMessage(`Failed to connect to '${name}', please check q-server-cfg.json`);
        }
    }

    sync(query: string): void {
        if (this.activeConn) {
            this.activeConn.k(query,
                (err, res) => {
                    if (err) {
                        console.log(err);
                    }
                    console.log(res);
                }
            );
        } else {
            window.showWarningMessage('No active q connection');
        }
    }

    loadCfg(): void {
        // read the q server configuration file from home dir
        this.qCfg = JSON.parse(fs.readFileSync(homedir() + '/.vscode/q-server-cfg.json', 'utf8'));
        this.qCfg.forEach((element: QConn) => {
            this.qConnPool.set(element['name'], new QConn(element));
        });
    }
}