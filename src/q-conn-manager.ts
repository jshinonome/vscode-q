/* eslint-disable quotes */
import { window, commands } from "vscode";
import * as q from "node-q";
import { homedir } from "os";
import * as fs from "fs";
import { QConn } from "./q-conn";
import { QueryView } from "./query-view";
import { QueryResultType } from "./query-result";

export class QConnManager {
    public static current: QConnManager | undefined;
    qConnPool = new Map<string, QConn>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    qCfg: any;
    activeConn: q.Connection | undefined;
    activeConnName: string | undefined;
    queryWrapper = '{r:value x;`type`data!(type r;r)}';

    public static create(): QConnManager {
        if (this.current) {
            return this.current;
        } else {
            return new QConnManager();
        }
    }

    private constructor() {
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
                    this.activeConnName = name;
                    commands.executeCommand('qservers.updateStatusBar', name);
                } else {
                    q.connect(qConn,
                        (err, conn) => {
                            if (err) window.showErrorMessage(err.message);
                            if (conn) {
                                qConn?.setConn(conn);
                                this.activeConn = conn;
                                this.activeConnName = name;
                                commands.executeCommand('qservers.updateStatusBar', name);
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
            this.activeConn.k(this.queryWrapper, query,
                (err, res) => {
                    if (err) {
                        QueryView.currentPanel?.update({ type: QueryResultType.STDERR, data: err });
                    }
                    if (res) {
                        QueryView.currentPanel?.update(res);
                    }
                }
            );
        } else {
            window.showErrorMessage('No Active q Connection');
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