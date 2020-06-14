import { TreeItem, TreeItemCollapsibleState, Command } from 'vscode';
import * as q from 'node-q';
import path = require('path');
import { QCfg } from './q-conn-manager';

export class QConn extends TreeItem {
    label: string;
    host: string;
    port: number;
    user: string;
    password: string;
    socketNoDelay: boolean;
    socketTimeout: number;
    conn?: q.Connection;
    command?: Command;
    constructor(cfg: QCfg) {
        super(cfg['label'], TreeItemCollapsibleState.None);
        this.host = ('host' in cfg) ? cfg['host'] : 'localhost';
        if (~'port' in cfg) {
            throw new Error('No port found in cfg file');
        }
        this.label = cfg['label'];
        this.port = cfg['port'];
        this.user = ('user' in cfg) ? cfg['user'] : '';
        this.password = ('password' in cfg) ? cfg['password'] : '';
        this.socketNoDelay = ('socketNoDelay' in cfg) ? cfg['socketNoDelay'] : false;
        this.socketTimeout = ('socketTimeout' in cfg) ? cfg['socketTimeout'] : 0;
        this.command = {
            command: 'qservers.connect',
            title: 'connect to q server',
            arguments: [this.label]
        };
    }

    setConn(conn: q.Connection | undefined): void {
        this.conn = conn;
    }

    get tooltip(): string {
        return `${this.host}:${this.port}`;
    }

    // get description(): string {
    //     if(this.conn){
    //         return 'connected';
    //     }else{
    //         return '';
    //     }
    // }

    iconPath = {
        light: path.join(__filename, '..', '..', 'resources', 'light', 'cpu-svgrepo-com.svg'),
        dark: path.join(__filename, '..', '..', 'resources', 'dark', 'cpu-svgrepo-com.svg')
    };

    contextValue = 'qconn';
}