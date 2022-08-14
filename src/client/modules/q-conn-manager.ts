import envPaths from 'env-paths';
import fs from 'fs';
import q from 'node-q';
import { homedir } from 'os';
import path from 'path';
import { commands, Uri, window, workspace } from 'vscode';
import { ChartView } from '../component/chart-viewer';
import { QueryGrid } from '../component/query-grid';
import { QueryView } from '../component/query-view';
import HistoryTreeItem from '../items/history';
import { discoveredProcessTag } from './discovery-server';
import { QConn } from './q-conn';
import { qServers } from './q-server-tree';
import { QStatusBarManager } from './q-status-bar-manager';
import { QueryConsole } from './query-console';
import { QueryResult } from './query-result';

const oldCfgPath = path.join(homedir(), '.vscode', 'q-server-cfg.json');
const cfgPath = path.join(envPaths('vscode-q').config, 'q-server-cfg.json');

class QConnManager {
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
    consoleSize: string;
    public static autoRefreshExplorer = workspace.getConfiguration().get('q-client.expl.autoRefresh') as boolean;
    public static queryMode = 'Console';
    public static queryWrapper = '';
    public static consoleMode = true;

    public static create(): QConnManager {
        if (!this.current) {
            this.current = new QConnManager();
        }
        return this.current;
    }

    private constructor() {
        this.loadCfg();
        this.updateQueryWrapper();
        this.consoleSize = workspace.getConfiguration().get('q-client.output.consoleSize') as string;
    }

    // when switch a server or toggle query mode, update wrapper
    public updateQueryWrapper(): void {
        const limit = this.isLimited ? '1000 sublist ' : '';
        const wrapper = QConnManager.consoleMode
            ? `{\`t\`r!(0b;.Q.S[${this.consoleSize};0j;value x])}`
            : `{res:value x;
                $[.Q.qt res;:\`t\`r\`m\`k!(1b;${limit}0!res;0!meta res;keys res);
                not 99h=type res;:\`t\`r!(0b;.Q.S[${this.consoleSize};0j;res]);
                11h <> type key res;;
                not (\`output in key res);;
                not 99h=type res\`output;;
                all \`bytes\`w\`h in key res\`output;:\`t\`r!(0b;res[\`output]);
                ];
                :\`t\`r\`m\`k!(1b;${limit}0!res;0!meta res:{([]k:.Q.s1 each key x;v:.Q.s1 each value x)}res;())
                }`;
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
    connect(uniqLabel: string, query = '', queryResultHandler = this.update): void {
        try {
            const qConn = this.getConn(uniqLabel);
            if (qConn) {
                const conn = qConn.conn;
                if (conn) {
                    this.activeConn = qConn;
                    QStatusBarManager.updateConnStatus(uniqLabel);
                    qServers.refresh();
                    commands.executeCommand('q-explorer.refreshEntry');
                    this.updateQueryWrapper();
                    if (query) {
                        this.sync(query, queryResultHandler);
                    }
                } else {
                    qConn.auth().then(qcfg => {
                        q.connect(qcfg,
                            (err, conn) => {
                                if (err) {
                                    window.showErrorMessage(err.message);
                                }
                                if (conn) {
                                    conn.addListener('close', _hadError => {
                                        if (_hadError) {
                                            console.log('Error happened during closing connection');
                                        }
                                        this.removeConn(uniqLabel);
                                    });
                                    qConn?.setConn(conn);
                                    this.activeConn = qConn;
                                    qServers.refresh();
                                    commands.executeCommand('q-explorer.refreshEntry');
                                    commands.executeCommand('q-explorer.revealEntry');
                                    QStatusBarManager.updateConnStatus(uniqLabel);
                                    if (query) {
                                        this.sync(query, queryResultHandler);
                                    }
                                }
                            }
                        );
                    }).catch(
                        reason => window.showErrorMessage(`Failed to connect to '${uniqLabel}', error - ${reason.toString()}`)
                    );
                }
            } else {
                const errorMsg = `process - ${uniqLabel} -  not found`;
                window.showWarningMessage(errorMsg);
            }
        } catch (error) {
            const errorMsg = `Failed to connect to '${uniqLabel}', please check q-server-cfg.json`;
            window.showErrorMessage(errorMsg);
        }
    }

    sync(query: string, queryResultHandler = this.update): void {
        if (this.isBusy && this.activeConn) {
            queryResultHandler({
                type: 'error',
                data: ['ERROR', 'Still executing last query'],
                duration: 0,
                uniqLabel: this.activeConn.uniqLabel,
            });
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
                    // reset conn status
                    this.isBusy = false;
                    this.busyConn = undefined;
                    QStatusBarManager.toggleQueryStatus(this.isBusy);
                    const duration = Date.now() - time;
                    if (err) {
                        queryResultHandler({ type: 'error', data: ['ERROR', err.message], duration, uniqLabel, query });
                        HistoryTreeItem.appendHistory(
                            { uniqLabel: uniqLabel, time: timestamp, duration: duration, query: query, errorMsg: err.message });
                    }
                    if (res) {
                        if (typeof res.r === 'string' && res.r.startsWith('ERROR')) {
                            const msg: string[] = res.r.split('\n');
                            queryResultHandler({ type: 'error', data: msg, duration, uniqLabel, query });
                            HistoryTreeItem.appendHistory({ uniqLabel: uniqLabel, time: timestamp, duration: duration, query: query, errorMsg: res.r });
                        } else if ('w' in res.r && 'h' in res.r && 'bytes' in res.r) {
                            queryResultHandler({ type: 'bytes', data: res.r.bytes, duration, uniqLabel });
                            HistoryTreeItem.appendHistory({ uniqLabel: uniqLabel, time: timestamp, duration: duration, query: query, errorMsg: '' });
                        } else if (res.t) {
                            queryResultHandler({
                                type: 'json',
                                data: res.r,
                                meta: res.m,
                                keys: res.k,
                                duration,
                                uniqLabel,
                                query
                            });
                            HistoryTreeItem.appendHistory({ uniqLabel: uniqLabel, time: timestamp, duration: duration, query: query, errorMsg: '' });
                        } else {
                            queryResultHandler({ type: 'text', data: res.r, duration, uniqLabel, query });
                            HistoryTreeItem.appendHistory({ uniqLabel: uniqLabel, time: timestamp, duration: duration, query: query, errorMsg: '' });
                        }
                    }

                    if (QConnManager.autoRefreshExplorer) {
                        commands.executeCommand('q-explorer.refreshEntry');
                    }
                }
            );
        } else {
            commands.executeCommand('q-client.connectEntry').then(
                uniqLabel => {
                    setTimeout(() => {
                        if (this.activeConn?.uniqLabel === uniqLabel) {
                            this.sync(query, queryResultHandler);
                        } else {
                            queryResultHandler(
                                {
                                    type: 'error',
                                    data: ['ERROR', `not connect to ${uniqLabel} yet`],
                                    duration: 0,
                                    uniqLabel: uniqLabel as string
                                });
                        }
                    }, 100);
                }
            );
        }
    }

    static polling(query: string): void {
        const current = QConnManager.current;
        current?.sync(query, result => {
            if (result.type === 'error') {
                current.stopPolling();
            }
            current.update(result);
        });
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

    update(result: QueryResult): void {
        const console = QueryConsole.createOrGet();
        switch (result.type) {
            case 'error':
                console.appendError(result.data, result.duration, result.uniqLabel, result.query);
                break;
            case 'json':
                if (QConnManager.queryMode === 'Grid') {
                    QueryGrid.createOrShow();
                    QueryGrid.update(result);
                } else {
                    QueryView.createOrShow();
                    QueryView.update(result);
                }
                break;
            case 'bytes':
                ChartView.Create(result.data);
                break;
            case 'text':
                console.append(result.data, result.duration, result.uniqLabel, result.query);
                break;
            default:
                window.showWarningMessage('Unsupported type message: ' + result.type);
        }
    }

    loadCfg(): void {
        // read the q server configuration file
        if (!fs.existsSync(cfgPath)) {
            fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
            if (fs.existsSync(oldCfgPath)) {
                fs.copyFileSync(oldCfgPath, cfgPath);
                fs.unlinkSync(oldCfgPath);
            } else {
                fs.writeFileSync(cfgPath, '[]', 'utf8');
            }
        }
        this.qCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        this.qCfg = this.qCfg.map(qcfg => {
            qcfg.uniqLabel = `${qcfg.tags},${qcfg.label}`;
            qcfg.useCustomizedAuth = qcfg.useCustomizedAuth === true;
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
        if (fs.existsSync(path)) {
            try {
                const qCfg = JSON.parse(fs.readFileSync(path, 'utf8'));
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
                            label: qcfg.label as string,
                            tags: qcfg.tags ?? '',
                            uniqLabel: `${qcfg.tags},${qcfg.label}`,
                            useCustomizedAuth: qcfg.useCustomizedAuth === true,
                            useTLS: qcfg.useTLS === true,
                        };
                    } else {
                        throw new Error('Please make sure to include port and label');
                    }
                });
                this.dumpCfg();
                commands.executeCommand('q-client.refreshEntry');
            } catch (error) {
                const { message } = error as Error;
                window.showErrorMessage(message);
            }
        }
    }

    async exportCfg(): Promise<void> {
        if (fs.existsSync(cfgPath)) {
            const cfg = fs.readFileSync(cfgPath, 'utf8');
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
                fs.writeFile(fileUri.fsPath, cfg, err => window.showErrorMessage(err?.message ?? ''));
            }
        }
    }

    abortQuery(): void {
        this.busyConn?.conn?.close();
        this.isBusy = false;
        this.busyConn = undefined;
        QStatusBarManager.toggleQueryStatus(this.isBusy);
    }

    disconnect(): void {
        this.activeConn?.conn?.close();
    }

    addCfg(qcfg: QCfg): void {
        const uniqLabel = qcfg.uniqLabel;
        this.qCfg = this.qCfg.filter(qcfg => qcfg.uniqLabel !== uniqLabel);
        this.qCfg.push(qcfg);
        this.qCfg.sort((q1, q2) => q1.uniqLabel.localeCompare(q2.uniqLabel));
        this.dumpCfg();
        commands.executeCommand('q-client.refreshEntry');
    }

    removeCfg(uniqLabel: string): void {
        this.qCfg = this.qCfg.filter(qcfg => qcfg.uniqLabel !== uniqLabel);
        this.dumpCfg();
        commands.executeCommand('q-client.refreshEntry');
    }

    dumpCfg(): void {
        fs.writeFileSync(cfgPath,
            JSON.stringify(
                this.qCfg
                    // skip discovered processes
                    .filter(qcfg => !qcfg.tags.startsWith(discoveredProcessTag))
                    .map(qcfg => {
                        return {
                            host: qcfg.host,
                            port: qcfg.port,
                            user: qcfg.user,
                            password: qcfg.password,
                            useTLS: qcfg.useTLS === true,
                            label: qcfg.label,
                            tags: qcfg.tags,
                            uniqLabel: `${qcfg.tags},${qcfg.label}`,
                            useCustomizedAuth: qcfg.useCustomizedAuth === true
                        };
                    }), null, 2), 'utf8');
    }

    removeConn(uniqLabel: string): void {
        const qConn = this.getConn(uniqLabel);
        qConn?.setConn(undefined);
        if (this.activeConn?.uniqLabel === uniqLabel) {
            this.activeConn = undefined;
            QStatusBarManager.updateConnStatus(undefined);
        }
        qServers.refresh();
        window.showWarningMessage(`Lost connection to ${uniqLabel} `);
    }
}

type QCfg = {
    host: string;
    port: number;
    user: string;
    password: string;
    label: string;
    tags: string;
    uniqLabel: string;
    useCustomizedAuth: boolean;
    useTLS: boolean;
}

export { QConnManager, QCfg };
