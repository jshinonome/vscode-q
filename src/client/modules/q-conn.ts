/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import q from 'node-q';
import path from 'path';
import { Command, extensions, TreeItem, TreeItemCollapsibleState, window } from 'vscode';
import { QCfg, QConnManager } from './q-conn-manager';
import { QServerTree } from './q-server-tree';

const customizedAuthExtension = extensions.getExtension('jshinonome.vscode-q-auth');
let customizedAuth = (qcfg: QCfg) => new Promise(resolve => resolve(qcfg));

customizedAuthExtension?.activate().then(_ => {
    customizedAuth = customizedAuthExtension.exports.auth;
    QConn.customizedAuthInstalled = true;
});

export class QConn extends TreeItem {
    label: string;
    host: string;
    port: number;
    user: string;
    password: string;
    useTLS: boolean;
    conn?: q.Connection;
    command?: Command;
    flipTables = false;
    // kdb+ version
    version = 3.0;
    tags: string;
    uniqLabel: string;
    useCustomizedAuth: boolean;
    _parent: QServerTree | null = null;

    public static customizedAuthInstalled = false;

    constructor(cfg: QCfg, conn: q.Connection | undefined = undefined) {
        super(cfg['label'], TreeItemCollapsibleState.None);
        this.host = ('host' in cfg) ? cfg['host'] : 'localhost';
        if (~'port' in cfg) {
            throw new Error('No port found in cfg file');
        }
        this.label = cfg['label'];
        this.port = cfg['port'];
        this.user = ('user' in cfg) ? cfg['user'] : '';
        this.password = ('password' in cfg) ? cfg['password'] : '';
        this.useTLS = ('useTLS' in cfg) ? cfg['useTLS'] : false;
        this.conn = conn;
        this.tags = cfg.tags ?? '';
        this.uniqLabel = `${cfg.tags},${cfg.label}`;
        this.command = {
            command: 'q-client.connect',
            title: 'connect to q server',
            arguments: [this.uniqLabel]
        };
        this.useCustomizedAuth = 'useCustomizedAuth' in cfg ? cfg['useCustomizedAuth'] : false;
        if (conn) {
            this.getKdbVersion();
        }
        this.tooltip = `${this.host}:${this.port}:${this.user}`;
    }

    setConn(conn: q.Connection | undefined): void {
        this.conn = conn;
        this.getKdbVersion();
    }

    getKdbVersion(): void {
        this.conn?.k('.z.K', (err, res) => {
            if (err)
                console.log('Cannot retrieve kdb+ version');
            if (res)
                this.version = res;
            this.tooltip = this.tooltip + ` - v${this.version}`;
            QConnManager.current?.updateQueryWrapper();
        });
    }

    auth(): Promise<QCfg> {
        if (this.useCustomizedAuth && QConn.customizedAuthInstalled) {
            if (customizedAuthExtension && customizedAuthExtension.isActive) {
                return customizedAuth(this) as Promise<QCfg>;
            } else {
                window.showWarningMessage('Customized Auth Plug-in(jshinonome.vscode-q-auth) is not found or not activated yet');
                return Promise.reject(new Error('Customized Auth Plug-in(jshinonome.vscode-q-auth) Not Found'));
            }
        } else {
            return Promise.resolve(this);
        }
    }

    // @ts-ignore
    get iconPath(): { light: string, dark: string } {
        if (QConnManager.current?.activeConn?.uniqLabel === this.uniqLabel) {
            return {
                light: path.join(__filename, '../../assets/svg/light/cpu-active.svg'),
                dark: path.join(__filename, '../../assets/svg/dark/cpu-active.svg')
            };
        } else if (this.conn) {
            return {
                light: path.join(__filename, '../../assets/svg/light/cpu-connected.svg'),
                dark: path.join(__filename, '../../assets/svg/dark/cpu-connected.svg')
            };
        } else {
            return {
                light: path.join(__filename, '../../assets/svg/light/cpu.svg'),
                dark: path.join(__filename, '../../assets/svg/dark/cpu.svg')
            };
        }
    }

    setParent(qServerTree: QServerTree) {
        this._parent = qServerTree;
    }

    contextValue = 'qconn';
}
