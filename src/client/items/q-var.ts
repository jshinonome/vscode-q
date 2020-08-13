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

export default class QVarTreeItem extends TreeItem {
    contextValue = 'qvar';
    _parent: TreeItem;
    _type: string;

    constructor(name: string, parent: QDictTreeItem, type: string) {
        super(name, TreeItemCollapsibleState.None);
        this._parent = parent;
        this._type = type;
        parent.appendChild(this);
        setCommand(this);
    }

    get iconPath(): { light: string, dark: string } {
        return {
            light: path.join(__filename, '../../assets/svg/item/var.svg'),
            dark: path.join(__filename, '../../assets/svg/item/var.svg')
        };
    }

    getParent(): TreeItem {
        return this._parent;
    }

    get tooltip(): string {
        return this._type;
    }

    getTreeItem(e: QVarTreeItem): TreeItem {
        return e;
    }

}