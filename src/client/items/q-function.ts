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

export default class QFunctionTreeItem extends TreeItem {
    contextValue = 'qfunction';
    _parent: TreeItem;
    _body: string;

    constructor(name: string, parent: QDictTreeItem, body: string) {
        super(name, TreeItemCollapsibleState.None);
        this._parent = parent;
        this._body = body;
        parent.appendChild(this);
        setCommand(this);
        this.tooltip = this._body;
        this.iconPath = {
            light: path.join(__filename, '../../assets/svg/item/function.svg'),
            dark: path.join(__filename, '../../assets/svg/item/function.svg')
        };
    }


    getParent(): TreeItem {
        return this._parent;
    }

    getTreeItem(e: QFunctionTreeItem): TreeItem {
        return e;
    }

}