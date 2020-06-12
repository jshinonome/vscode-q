import { TreeDataProvider, TreeItem, EventEmitter, Event, CommentThreadCollapsibleState } from 'vscode';
import { QConn } from './q-conn';
import { QConnManager } from './q-conn-manager';

export class QServerTreeProvider implements TreeDataProvider<QConn> {
    private qConnManager: QConnManager;
    private _onDidChangeTreeData: EventEmitter<QConn | undefined> = new EventEmitter<QConn | undefined>();
    readonly onDidChangeTreeData: Event<QConn | undefined> = this._onDidChangeTreeData.event;

    constructor() {
        this.qConnManager = new QConnManager();
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