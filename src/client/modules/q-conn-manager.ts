/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import * as fs from 'fs';
import * as q from 'node-q';
import { homedir } from 'os';
import { commands, window } from 'vscode';
import { QConn } from './q-conn';
import { QStatusBarManager } from './q-status-bar-manager';
import { QueryConsole } from './query-console';
import { QueryView } from './query-view';

const cfgDir = homedir() + '/.vscode/';
const cfgPath = cfgDir + 'q-server-cfg.json';

export class QConnManager {
    public static current: QConnManager | undefined;
    qConnPool = new Map<string, QConn>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    qCfg: QCfg[] = [];
    activeConn: QConn | undefined;
    isBusy = false;
    queryWrapper = '';
    isLimited = true;
    // exception: true|false
    // type: number
    // data: return
    // cols: columns of table
    public static queryWrapper = '';
    public static consoleMode = false;

    public static create(): QConnManager {
        if (!this.current) {
            this.current = new QConnManager();
        }
        return this.current;
    }

    private constructor() {
        this.loadCfg();
        this.updateQueryWrapper();
    }

    public static toggleMode(): void {
        QConnManager.consoleMode = !QConnManager.consoleMode;
        QConnManager.current?.updateQueryWrapper();
    }

    // when switch a server or toggle query mode, update wrapper
    public updateQueryWrapper(): void {
        const limit = this.isLimited ? '1000 sublist ' : '';
        const wrapper = QConnManager.consoleMode
            ? '{`t`r!(0b;.Q.S[system"c";0j;value x])}'
            : `{res:value x;$[(count res) & .Q.qt res;:\`t\`r\`m!(1b;${limit}0!res;0!meta res);:\`t\`r!(0b;.Q.S[system"c";0j;res])]}`;
        if (this.activeConn && this.activeConn.version < 3.5)
            this.queryWrapper = wrapper;
        else
            this.queryWrapper = `{{-105!(x;enlist y;{\`t\`r!(0b;x,"\n",.Q.sbt@(-3)_y)})}[${wrapper};x]}`;
    }


    public toggleLimitQuery(): void {
        this.isLimited = !this.isLimited;
        QStatusBarManager.updateUnlimitedQueryStatus(this.isLimited);
        this.updateQueryWrapper();
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
                    this.activeConn = qConn;
                    QStatusBarManager.updateConnStatus(label);
                    commands.executeCommand('qservers.refreshEntry');
                    this.updateQueryWrapper();
                } else {
                    q.connect(qConn,
                        (err, conn) => {
                            if (err) window.showErrorMessage(err.message);
                            if (conn) {
                                conn.addListener('close', _hadError => {
                                    if (_hadError) {
                                        console.log('Error happened during closing connection');
                                    }
                                    this.removeConn(label);
                                });
                                qConn?.setConn(conn);
                                this.activeConn = qConn;
                                commands.executeCommand('qservers.refreshEntry');
                                QStatusBarManager.updateConnStatus(label);
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
        if (this.isBusy) {
            window.showWarningMessage('Still executing last query');
        } else if (this.activeConn) {
            if (query.slice(-1) === ';') {
                query = query.slice(0, -1);
            }
            this.isBusy = true;
            QStatusBarManager.updateQueryStatus(this.isBusy);
            const time = Date.now();
            this.activeConn?.conn?.k(this.queryWrapper, query,
                (err, res) => {
                    QueryConsole.createOrShow();
                    if (err) {
                        QueryConsole.current?.append(err.message, Date.now() - time);
                    }
                    if (res) {
                        if (QConnManager.consoleMode) {
                            QueryConsole.current?.append(res.r, Date.now() - time);
                        } else {
                            if (res.t) {
                                QueryView.createOrShow();
                                QueryView.currentPanel?.update({
                                    type: 'json',
                                    data: res.r,
                                    meta: res.m
                                });
                                QueryConsole.current?.append(`${res.r[Object.keys(res.r)[0]].length} row(s) returned`, Date.now() - time);
                            }
                            else {
                                QueryConsole.current?.append(res.r, Date.now() - time);
                            }
                        }
                    }
                    this.isBusy = false;
                    QStatusBarManager.updateQueryStatus(this.isBusy);
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
                if (currentQconnPool.get(qcfg.label)) {
                    const qConn = new QConn(qcfg, currentQconnPool.get(qcfg.label)?.conn);
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

    removeConn(label: string): void {
        const qConn = this.getConn(label);
        qConn?.setConn(undefined);
        if (this.activeConn?.label === label) {
            this.activeConn = undefined;
            QStatusBarManager.updateConnStatus(undefined);
        }
        commands.executeCommand('qservers.refreshEntry');
        window.showWarningMessage(`Lost connection to ${label.toUpperCase()}`);
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
