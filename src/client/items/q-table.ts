/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import path from 'path';
import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import QDictTreeItem from './q-dict';
import { setCommand } from './q-utils';

export default class QTableTreeItem extends TreeItem {
    contextValue = 'qtable';
    _parent: TreeItem;

    constructor(name: string, parent: QDictTreeItem, isPartitionedTable: boolean) {
        super(name, TreeItemCollapsibleState.None);
        this._parent = parent;
        parent.appendChild(this);
        setCommand(this);
        if (isPartitionedTable) {
            this.iconPath = {
                light: path.join(__filename, '../../assets/svg/item/p-table.svg'),
                dark: path.join(__filename, '../../assets/svg/item/p-table.svg')
            };
        } else {
            this.iconPath = {
                light: path.join(__filename, '../../assets/svg/item/table.svg'),
                dark: path.join(__filename, '../../assets/svg/item/table.svg')
            };
        }
    }

    getParent(): TreeItem {
        return this._parent;
    }

    getTreeItem(e: QTableTreeItem): TreeItem {
        return e;
    }

}
