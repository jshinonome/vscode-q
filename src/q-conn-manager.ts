/* eslint-disable quotes */
import { window, commands } from "vscode";
import * as q from "node-q";
import { homedir } from "os";
import * as fs from "fs";
import { QConn } from "./q-conn";
import { QueryView } from "./query-view";

const cfgDir = homedir() + '/.vscode/';
const cfgPath = cfgDir + 'q-server-cfg.json';

export class QConnManager {
    public static current: QConnManager | undefined;
    qConnPool = new Map<string, QConn>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    qCfg: QCfg[] = [];
    activeConn: q.Connection | undefined;
    activeConnLabel: string | undefined;
    // exception: true|false
    // type: number
    // data: return
    // cols: columns of table
    queryWrapper = '@[{r:value x;`exception`type`data`cols!(0b;t;r;$[(t:type r) in 98 99h;cols r;()])};;{`exception`data!(1b;x)}]';

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

    getConn(label: string): QConn | undefined {
        return this.qConnPool.get(label);
    }

    connect(label: string): void {
        try {
            const qConn = this.getConn(label);
            if (qConn) {
                const conn = qConn.conn;
                if (conn) {
                    this.activeConn = conn;
                    this.activeConnLabel = label;
                    commands.executeCommand('qservers.updateStatusBar', label);
                } else {
                    q.connect(qConn,
                        (err, conn) => {
                            if (err) window.showErrorMessage(err.message);
                            if (conn) {
                                qConn?.setConn(conn);
                                this.activeConn = conn;
                                this.activeConnLabel = label;
                                commands.executeCommand('qservers.updateStatusBar', label);
                            }
                        }
                    );
                }
            }
        } catch (error) {
            window.showErrorMessage(`Failed to connect to '${label}', please check q-server-cfg.json`);
        }
    }

    sync(query: string): void {
        if (this.activeConn) {
            this.activeConn.k(this.queryWrapper, query,
                (err, res) => {
                    if (err) {
                        QueryView.currentPanel?.update(
                            {
                                exception: true,
                                data: err
                            }
                        );
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
        if (fs.existsSync(cfgPath)) {
            this.qCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
            // reserver current conn
            const currentQconnPool = new Map(this.qConnPool);
            this.qConnPool.clear();
            this.qCfg.forEach((qcfg: QCfg) => {
                if (qcfg.label in currentQconnPool) {
                    const qConn = new QConn(qcfg);
                    qConn.setConn(currentQconnPool.get(qcfg.label)?.conn);
                    this.qConnPool.set(qcfg.label, qConn);
                } else {
                    this.qConnPool.set(qcfg['label'], new QConn(qcfg));
                }
            });
        } else {
            if (!fs.existsSync(cfgDir)) {
                fs.mkdirSync(cfgDir);
            }
            fs.writeFileSync(cfgPath, '[]', 'utf8');
        }
    }

    addCfg(qcfg: QCfg): void {
        const label = qcfg.label;
        this.qCfg = this.qCfg.filter(qcfg => qcfg.label !== label);
        this.qCfg.push(qcfg);
        this.qCfg.sort((q1, q2) => q1.label.localeCompare(q2.label));
        this.dumpCfg();
        commands.executeCommand('qservers.refreshEntry');
    }

    removeCfg(label: string): void {
        this.qCfg = this.qCfg.filter(qcfg => qcfg.label !== label);
        this.dumpCfg();
        commands.executeCommand('qservers.refreshEntry');
    }

    dumpCfg(): void {
        fs.writeFileSync(cfgPath, JSON.stringify(this.qCfg, null, 4), 'utf8');
    }
}

export type QCfg = {
    host: string;
    port: number;
    user: string;
    password: string;
    socketNoDelay: boolean;
    socketTimeout: number;
    label: string;
}
