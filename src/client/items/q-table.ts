/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import QDictTreeItem from './q-dict';
import { setCommand } from './q-utils';
import path = require('path');

export default class QTableTreeItem extends TreeItem {
    contextValue = 'qtable';
    _parent: TreeItem;
    _cols: string[] = [];

    constructor(name: string, parent: QDictTreeItem, cols: string[]) {
        super(name, TreeItemCollapsibleState.None);
        this._parent = parent;
        this._cols = cols;
        parent.appendChild(this);
        setCommand(this);
    }

    get iconPath(): { light: string, dark: string } {
        return {
            light: path.join(__filename, '../../assets/svg/item/table.svg'),
            dark: path.join(__filename, '../../assets/svg/item/table.svg')
        };
    }

    getParent(): TreeItem {
        return this._parent;
    }

    get tooltip(): string {
        return `col:${this._cols.length}`;
    }

    getTreeItem(e: QTableTreeItem): TreeItem {
        return e;
    }

}