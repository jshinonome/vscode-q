/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import * as fs from 'fs/promises';
import * as q from 'node-q';
import { homedir } from 'os';
import { commands, Uri, window, workspace } from 'vscode';
import HistoryTreeItem from '../items/history';
import { QueryResult } from '../models/query-result';
import { QConn } from './q-conn';
import { QStatusBarManager } from './q-status-bar-manager';
import { QueryConsole } from './query-console';
import { QueryGrid } from '../component/query-grid';
import { QueryView } from '../component/query-view';
import path = require('path');
import { fileExists } from '../util/fs-utils';

const cfgDir = homedir() + '/.vscode/';
const cfgPath = cfgDir + 'q-server-cfg.json';

export class QConnManager {
    public static current: QConnManager | undefined;
    qConnPool = new Map<string, QConn>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    qCfg: QCfg[] = [];
    activeConn: QConn | undefined;
    isBusy = false;
    busyConn: QConn | undefined = undefined;
    queryWrapper = '';
    isLimited = true;
    pollingId: NodeJS.Timer | undefined = undefined;
    public static consoleSize = workspace.getConfiguration().get('q-client.output.consoleSize') as string;
    public static autoRefreshExplorer = workspace.getConfiguration().get('q-client.expl.autoRefresh') as boolean;
    public static queryMode = 'Console';
    public static queryWrapper = '';
    public static consoleMode = true;

    public static async create(): Promise<QConnManager> {
        if (!QConnManager.current) {
            QConnManager.current = new QConnManager();
            await QConnManager.current.loadCfg();
            QConnManager.current.updateQueryWrapper();
        }
        return QConnManager.current;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    private constructor() {}

    // when switch a server or toggle query mode, update wrapper
    public updateQueryWrapper(): void {
        const limit = this.isLimited ? '1000 sublist ' : '';
        const consoleSize = 'system"c"';
        const wrapper = QConnManager.consoleMode
            ? `{\`t\`r!(0b;.Q.S[${consoleSize};0j;value x])}`
            : `{res:value x;$[(count res) & .Q.qt res;:\`t\`r\`m\`k!(1b;${limit}0!res;0!meta res;keys res);99h=type res;\`t\`r\`m\`k!(1b;${limit}0!res;0!meta res:{([]k:.Q.s1 each key x;v:.Q.s1 each value x)}res;());:\`t\`r!(0b;.Q.S[${consoleSize};0j;res])]}`;
        if (this.activeConn && this.activeConn.version < 3.5)
            this.queryWrapper = wrapper;
        else
            this.queryWrapper = `{{-105!(x;enlist y;{\`t\`r!(0b;"ERROR\n",x,"\n",.Q.sbt@(-3)_y)})}[${wrapper};x]}`;
    }


    public toggleLimitQuery(): void {
        this.isLimited = !this.isLimited;
        QStatusBarManager.updateUnlimitedQueryStatus(this.isLimited);
        this.updateQueryWrapper();
    }

    public static setQueryMode(mode: string): void {
        QConnManager.queryMode = mode;
        if (mode === 'Console') {
            QConnManager.consoleMode = true;
            QueryGrid.currentPanel?.dispose();
            QueryView.currentPanel?.dispose();
        } else if (mode === 'Grid') {
            QueryView.currentPanel?.dispose();
            QConnManager.consoleMode = false;
        } else if (mode === 'Visualization') {
            QueryGrid.currentPanel?.dispose();
            QConnManager.consoleMode = false;
        }
        QConnManager.current?.updateQueryWrapper();
    }

    getConn(uniqLabel: string): QConn | undefined {
        return this.qConnPool.get(uniqLabel);
    }

    // query to run after connected to q server
    connect(uniqLabel: string, query = ''): void {
        try {
            const qConn = this.getConn(uniqLabel);
            if (qConn) {
                const conn = qConn.conn;
                if (conn) {
                    this.activeConn = qConn;
                    QStatusBarManager.updateConnStatus(uniqLabel);
                    commands.executeCommand('q-client.refreshEntry');
                    commands.executeCommand('q-explorer.refreshEntry');
                    this.updateQueryWrapper();
                    if (query) {
                        this.sync(query);
                    }
                } else {
                    qConn.auth().then(qcfg => {
                        q.connect(qcfg,
                            (err, conn) => {
                                if (err) window.showErrorMessage(err.message);
                                if (conn) {
                                    conn.addListener('close', _hadError => {
                                        if (_hadError) {
                                            console.log('Error happened during closing connection');
                                        }
                                        this.removeConn(uniqLabel);
                                    });
                                    qConn?.setConn(conn);
                                    this.activeConn = qConn;
                                    commands.executeCommand('q-client.refreshEntry');
                                    commands.executeCommand('q-explorer.refreshEntry');
                                    QStatusBarManager.updateConnStatus(uniqLabel);
                                    if (query) {
                                        this.sync(query);
                                    }
                                    if (QConnManager.consoleSize.length > 0) {
                                        conn.k('\\c ' + QConnManager.consoleSize, (err, _res) => {
                                            if (err)
                                                console.log('Fail to set console size');
                                        });
                                    }
                                }
                            }
                        );
                    }).catch(reason => console.log(reason));

                }
            } else {
                window.showWarningMessage(`process - ${uniqLabel} -  not found`);
            }
        } catch (error) {
            window.showErrorMessage(`Failed to connect to '${uniqLabel}', please check q-server-cfg.json`);
        }
    }

    sync(query: string): void {
        if (this.isBusy) {
            window.showWarningMessage('Still executing last query');
        } else if (this.activeConn) {
            if (query.slice(-1) === ';') {
                query = query.slice(0, -1);
            } else if (query[0] === '`') {
                // append space if query starts with back-tick, otherwise query will be treated as a symbol.
                query = query + ' ';
            }
            this.isBusy = true;
            this.busyConn = this.activeConn;
            QStatusBarManager.toggleQueryStatus(this.isBusy);
            const uniqLabel = this.activeConn?.uniqLabel;
            const time = Date.now();
            const timestamp = new Date();
            this.activeConn?.conn?.k(this.queryWrapper, query,
                (err, res) => {
                    this.isBusy = false;
                    this.busyConn = undefined;
                    QueryConsole.createOrShow();
                    const duration = Date.now() - time;
                    if (err) {
                        QueryConsole.current?.appendError(['ERROR', err.message], duration, uniqLabel, query);
                        HistoryTreeItem.appendHistory(
                            { uniqLabel: uniqLabel, time: timestamp, duration: duration, query: query, errorMsg: err.message });
                    }
                    if (res) {
                        if (typeof res.r === 'string' && res.r.startsWith('ERROR')) {
                            const msg: string[] = res.r.split('\n');
                            QueryConsole.current?.appendError(msg, duration, uniqLabel, query);
                            HistoryTreeItem.appendHistory({ uniqLabel: uniqLabel, time: timestamp, duration: duration, query: query, errorMsg: res.r });
                        } else if (QConnManager.consoleMode) {
                            QueryConsole.current?.append(res.r, duration, uniqLabel, query);
                            HistoryTreeItem.appendHistory({ uniqLabel: uniqLabel, time: timestamp, duration: duration, query: query, errorMsg: '' });
                        } else {
                            if (res.t) {
                                this.update({
                                    type: 'json',
                                    data: res.r,
                                    meta: res.m,
                                    keys: res.k,
                                    query: query,
                                });
                                QueryConsole.current?.append(`> ${res.r[Object.keys(res.r)[0]].length} row(s) returned`, duration, uniqLabel, query);
                            }
                            else {
                                QueryConsole.current?.append(res.r, duration, uniqLabel, query);
                            }
                            HistoryTreeItem.appendHistory({ uniqLabel: uniqLabel, time: timestamp, duration: duration, query: query, errorMsg: '' });
                        }
                    }
                    QStatusBarManager.toggleQueryStatus(this.isBusy);
                    if (QConnManager.autoRefreshExplorer) {
                        commands.executeCommand('q-explorer.refreshEntry');
                    }
                }
            );
        } else {
            commands.executeCommand('q-client.connectEntry').then(
                uniqLabel => this.connect(uniqLabel as string, query)
            );
        }
    }

    private static polling(query: string): void {
        const current = QConnManager.current;
        if (current && !current.isBusy && current.activeConn) {
            if (query.slice(-1) === ';') {
                query = query.slice(0, -1);
            } else if (query[0] === '`') {
                // append space if query starts with back-tick, otherwise query will be treated as a symbol.
                query = query + ' ';
            }
            current.isBusy = true;
            current.busyConn = current.activeConn;
            QStatusBarManager.toggleQueryStatus(current.isBusy);
            const uniqLabel = current.activeConn?.uniqLabel;
            const time = Date.now();
            current.activeConn?.conn?.k(current.queryWrapper, query,
                (err, res) => {
                    current.isBusy = false;
                    current.busyConn = undefined;
                    QueryConsole.createOrShow();
                    const duration = Date.now() - time;
                    if (err) {
                        QueryConsole.current?.appendError(['ERROR', err.message], duration, uniqLabel, query);
                        current.stopPolling();
                    }
                    if (res) {
                        if (typeof res.r === 'string' && res.r.startsWith('ERROR')) {
                            const msg: string[] = res.r.split('\n');
                            QueryConsole.current?.appendError(msg, duration, uniqLabel, query);
                            current.stopPolling();
                        } else {
                            if (res.t) {
                                current.update({
                                    type: 'json',
                                    data: res.r,
                                    meta: res.m,
                                    keys: res.k,
                                });
                                QueryConsole.current?.append(`> ${res.r[Object.keys(res.r)[0]].length} row(s) returned`, duration, uniqLabel, query);
                            }
                            else {
                                QueryConsole.current?.append(res.r, duration, uniqLabel, query);
                            }
                        }
                    }
                    QStatusBarManager.toggleQueryStatus(current.isBusy);
                }
            );
        }
    }

    startPolling(interval: number, query: string): void {
        if (this.pollingId) {
            this.stopPolling();
        }
        if (interval && query)
            this.pollingId = setInterval(QConnManager.polling, interval, query);
    }

    stopPolling(): void {
        if (this.pollingId) {
            clearInterval(this.pollingId);
            this.pollingId = undefined;
        }
    }

    async update(result: QueryResult) {
        if (QConnManager.queryMode === 'Grid') {
            await QueryGrid.createOrShow();
            QueryGrid.update(result);
        } else {
            await QueryView.createOrShow();
            QueryView.update(result);
        }
    }

    async loadCfg(): Promise<void> {
        // read the q server configuration file from home dir
        if (await fileExists(cfgPath)) {
            this.qCfg = JSON.parse(await fs.readFile(cfgPath, 'utf8'));
            this.qCfg = this.qCfg.map(qcfg => {
                qcfg.uniqLabel = `${qcfg.tags},${qcfg.label}`;
                qcfg.useCustomizedAuth = qcfg.useCustomizedAuth === true ? true : false;
                return qcfg;
            });
            // reserver current conn
            const currentQconnPool = new Map(this.qConnPool);
            this.qConnPool.clear();
            this.qCfg.forEach((qcfg: QCfg) => {
                if (!this.qConnPool.get(qcfg.uniqLabel)) {
                    this.qConnPool.set(qcfg.uniqLabel, new QConn(qcfg, currentQconnPool.get(qcfg.uniqLabel)?.conn));
                }
            });
        } else {
            if (!await fileExists(cfgDir)) {
                await fs.mkdir(cfgDir);
            }
            await fs.writeFile(cfgPath, '[]', 'utf8');
        }
    }

    async importCfg(): Promise<void> {
        if (!workspace.workspaceFolders) {
            window.showErrorMessage('No opened workspace folder');
            return;
        }
        const workspaceFolder = workspace.workspaceFolders[0].uri;
        const paths = await window.showOpenDialog({
            defaultUri: workspaceFolder,
            canSelectMany: false
        });
        let path = '';
        if (paths && paths.length > 0) {
            path = paths[0].fsPath;
        }
        if (await fileExists(path)) {
            try {
                const qCfg = JSON.parse(await fs.readFile(path, 'utf8'));
                this.qCfg = qCfg.map((qcfg: QCfg) => {
                    if (qcfg.port && qcfg.label) {
                        if (!parseInt(qcfg.port as unknown as string)) {
                            window.showErrorMessage(`Please input an integer for port of '${qcfg.label}'`);
                        }
                        return {
                            host: qcfg.host,
                            port: qcfg.port,
                            user: qcfg.user ?? '',
                            password: qcfg.password ?? '',
                            socketNoDelay: qcfg.socketNoDelay ?? false,
                            socketTimeout: qcfg.socketTimeout ?? 0,
                            label: qcfg.label as string,
                            tags: qcfg.tags ?? '',
                            uniqLabel: `${qcfg.tags},${qcfg.label}`,
                            useCustomizedAuth: `${qcfg.useCustomizedAuth ?? false}`
                        };
                    } else {
                        throw new Error('Please make sure to include port and label');
                    }
                });
                await this.dumpCfg();
                commands.executeCommand('q-client.refreshEntry');
            } catch (error) {
                const { message } = error as Error;
                window.showErrorMessage(message);
            }
        }
    }

    async exportCfg(): Promise<void> {
        if (await fileExists(cfgPath)) {
            const cfg = await fs.readFile(cfgPath, 'utf8');
            if (!workspace.workspaceFolders) {
                window.showErrorMessage('No opened workspace folder');
                return;
            }
            const workspaceFolder = workspace.workspaceFolders[0].uri.fsPath;
            const filePath = path.join(workspaceFolder, 'q-server-cfg.json');
            const fileUri = await window.showSaveDialog({
                defaultUri: Uri.parse(filePath).with({ scheme: 'file' })
            });
            if (fileUri) {
                try {
                    await fs.writeFile(fileUri.fsPath, cfg);
                } catch (e) {
                    window.showErrorMessage((e as Error)?.message ?? '');
                }
            }
        }
    }

    abortQuery(): void {
        this.busyConn?.conn?.close();
        this.isBusy = false;
        this.busyConn = undefined;
        QStatusBarManager.toggleQueryStatus(this.isBusy);
    }

    async addCfg(qcfg: QCfg) {
        const uniqLabel = qcfg.uniqLabel;
        this.qCfg = this.qCfg.filter(qcfg => qcfg.uniqLabel !== uniqLabel);
        this.qCfg.push(qcfg);
        this.qCfg.sort((q1, q2) => q1.uniqLabel.localeCompare(q2.uniqLabel));
        await this.dumpCfg();
        commands.executeCommand('q-client.refreshEntry');
    }

    async removeCfg(uniqLabel: string) {
        this.qCfg = this.qCfg.filter(qcfg => qcfg.uniqLabel !== uniqLabel);
        await this.dumpCfg();
        commands.executeCommand('q-client.refreshEntry');
    }

    async dumpCfg(): Promise<void> {
        await fs.writeFile(cfgPath, JSON.stringify(this.qCfg.map(qcfg => {
            return {
                host: qcfg.host,
                port: qcfg.port,
                user: qcfg.user,
                password: qcfg.password,
                socketNoDelay: qcfg.socketNoDelay,
                socketTimeout: qcfg.socketTimeout,
                label: qcfg.label,
                tags: qcfg.tags,
                uniqLabel: `${qcfg.tags},${qcfg.label}`,
                useCustomizedAuth: qcfg.useCustomizedAuth === true
            };
        }), null, 4), 'utf8');
    }

    removeConn(uniqLabel: string): void {
        const qConn = this.getConn(uniqLabel);
        qConn?.setConn(undefined);
        if (this.activeConn?.uniqLabel === uniqLabel) {
            this.activeConn = undefined;
            QStatusBarManager.updateConnStatus(undefined);
        }
        commands.executeCommand('q-client.refreshEntry');
        window.showWarningMessage(`Lost connection to ${uniqLabel} `);
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
    tags: string;
    uniqLabel: string;
    useCustomizedAuth: boolean;
}
