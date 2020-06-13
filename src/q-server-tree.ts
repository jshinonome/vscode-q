import { TreeDataProvider, TreeItem, EventEmitter, Event } from 'vscode';
import { QConn } from './q-conn';
import { QConnManager } from './q-conn-manager';

export class QServerTreeProvider implements TreeDataProvider<QConn> {
    private _onDidChangeTreeData: EventEmitter<QConn | undefined> = new EventEmitter<QConn | undefined>();
    readonly onDidChangeTreeData: Event<QConn | undefined> = this._onDidChangeTreeData.event;

    public qConnManager: QConnManager;

    constructor() {
        this.qConnManager = new QConnManager();
    }
    // TODO: keep active conns after refresh
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