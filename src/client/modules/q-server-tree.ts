/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { Event, EventEmitter, TreeDataProvider, TreeItem } from 'vscode';
import { QConn } from './q-conn';
import { QConnManager } from './q-conn-manager';

export class QServerTreeProvider implements TreeDataProvider<QConn> {
    private _onDidChangeTreeData: EventEmitter<QConn | undefined> = new EventEmitter<QConn | undefined>();
    readonly onDidChangeTreeData: Event<QConn | undefined> = this._onDidChangeTreeData.event;

    public qConnManager: QConnManager;

    constructor() {
        this.qConnManager = QConnManager.create();
    }

    refresh(): void {
        this.qConnManager.loadCfg();
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(e: QConn): TreeItem {
        return e;
    }

    getChildren(e?: QConn): Thenable<QConn[]> {
        if (e) {
            return Promise.resolve([]);
        } else {
            return Promise.resolve(
                Array.from(this.qConnManager.qConnPool.values())
            );
        }
    }
}