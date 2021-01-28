/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { MarkdownString, TreeItem, TreeItemCollapsibleState } from 'vscode';
import { kAttributeMap, kTypeName } from '../util/k-map';
import QDictTreeItem from './q-dict';
import { setCommand } from './q-utils';
import path = require('path');

type Meta = {
    c: string[],
    t: string[],
    a: string[],
    f: string[],
}

export default class QTableTreeItem extends TreeItem {
    contextValue = 'qtable';
    _parent: TreeItem;
    _meta: Meta;

    constructor(name: string, parent: QDictTreeItem, meta: Meta) {
        super(name, TreeItemCollapsibleState.None);
        this._parent = parent;
        this._meta = meta;
        parent.appendChild(this);
        setCommand(this);
        this.iconPath = {
            light: path.join(__filename, '../../assets/svg/item/table.svg'),
            dark: path.join(__filename, '../../assets/svg/item/table.svg')
        };
        const md = new MarkdownString();
        md.appendMarkdown('|column|t|type|foreign key|attribute|\n|------|-|------|------|------|\n');
        for (const i of meta.c.keys()) {
            md.appendMarkdown(`|${meta.c[i]}|${meta.t[i]}|${kTypeName.get(meta.t[i])}|${meta.f[i] ?? ''}|${kAttributeMap.get(meta.a[i]) ?? ''}|\n`);
        }
        this.tooltip = md;
    }

    getParent(): TreeItem {
        return this._parent;
    }

    getTreeItem(e: QTableTreeItem): TreeItem {
        return e;
    }

}