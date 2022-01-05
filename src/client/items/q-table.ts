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

    constructor(name: string, parent: QDictTreeItem) {
        super(name, TreeItemCollapsibleState.None);
        this._parent = parent;
        parent.appendChild(this);
        setCommand(this);
        this.iconPath = {
            light: path.join(__filename, '../../assets/svg/item/table.svg'),
            dark: path.join(__filename, '../../assets/svg/item/table.svg')
        };
    }

    getParent(): TreeItem {
        return this._parent;
    }

    getTreeItem(e: QTableTreeItem): TreeItem {
        return e;
    }

}