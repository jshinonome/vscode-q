import path from 'path';
import { Event, EventEmitter, TreeDataProvider, TreeItem, TreeItemCollapsibleState } from 'vscode';
import { QConn } from './q-conn';
import { QConnManager } from './q-conn-manager';

const qConnManager = QConnManager.create();

export class QServerTree extends TreeItem implements TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: EventEmitter<QConn | undefined> = new EventEmitter<QConn | undefined>();
    readonly onDidChangeTreeData: Event<QConn | undefined> = this._onDidChangeTreeData.event;
    _parent: TreeItem | null;
    _children: TreeItem[] = [];


    constructor(label: string, parent: TreeItem | null) {
        super(label, TreeItemCollapsibleState.Collapsed);
        this._parent = parent;
    }

    refresh(): void {
        if (this._parent) {
            return;
        }
        qConnManager.loadCfg();
        this._children = [];
        const itemMap = new Map<string, QServerTree>();
        qConnManager.qConnPool.forEach(qconn => {
            if (qconn.tags.length) {
                // eslint-disable-next-line @typescript-eslint/no-this-alias
                let parent: QServerTree = this;
                let path = '';
                qconn.tags.split(',').forEach(
                    tag => {
                        path += tag;
                        const item = itemMap.get(path);
                        if (item) {
                            parent = item;
                        } else {
                            const newItem = new QServerTree(tag, parent);
                            itemMap.set(path, newItem);
                            parent.appendChild(newItem);
                            parent = newItem;
                        }
                    }
                );
                const item = itemMap.get(path);
                if (item) {
                    qconn.setParent(item);
                    item.appendChild(qconn);
                }
            } else {
                qconn.setParent(this);
                this._children.push(qconn);
            }
        });
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(e: TreeItem): TreeItem {
        return e;
    }

    getChildren(e?: TreeItem): Thenable<TreeItem[]> {
        if (e instanceof QServerTree) {
            return Promise.resolve(e.getChildren());
        } else if (e instanceof QConn) {
            return Promise.resolve([]);
        } else {
            return Promise.resolve(
                this._children
            );
        }
    }

    getParent(e: TreeItem): TreeItem | null {
        let parent: TreeItem | null;
        if (e instanceof QServerTree) {
            parent = e._parent;
        } else if (e instanceof QConn) {
            parent = e._parent;
        } else {
            parent = this._parent;
        }
        // as root is not available, return null here
        if (parent?.label === 'root') {
            return null;
        } else {
            return parent;
        }
    }

    appendChild(item: TreeItem): void {
        this._children.push(item);
    }

    // @ts-ignore
    get iconPath(): { light: string, dark: string } {
        if (!this.label) {
            return {
                light: path.join(__filename, '../../assets/svg/item/tag.svg'),
                dark: path.join(__filename, '../../assets/svg/item/tag.svg')
            };
        } else if (['dev', 'development'].indexOf(this.label as string) >= 0) {
            return {
                light: path.join(__filename, '../../assets/svg/item/tag-dev.svg'),
                dark: path.join(__filename, '../../assets/svg/item/tag-dev.svg')
            };
        } else if (['uat', 'compute', 'cgm'].indexOf(this.label as string) >= 0) {
            return {
                light: path.join(__filename, '../../assets/svg/item/tag-uat.svg'),
                dark: path.join(__filename, '../../assets/svg/item/tag-uat.svg')
            };
        } else if (['prd', 'prod', 'product'].indexOf(this.label as string) >= 0) {
            return {
                light: path.join(__filename, '../../assets/svg/item/tag-prod.svg'),
                dark: path.join(__filename, '../../assets/svg/item/tag-prod.svg')
            };
        } else {
            return {
                light: path.join(__filename, '../../assets/svg/item/tag.svg'),
                dark: path.join(__filename, '../../assets/svg/item/tag.svg')
            };
        }

    }
}
