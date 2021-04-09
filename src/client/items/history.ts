/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import * as fs from 'fs';
import { homedir } from 'os';
import { Event, EventEmitter, MarkdownString, TreeDataProvider, TreeItem, TreeItemCollapsibleState } from 'vscode';
import path = require('path');
import dayjs = require('dayjs');

const cfgDir = homedir() + '/.vscode/';
const historyPath = cfgDir + 'q-query-history.json';

type History = {
    uniqLabel: string,
    time: Date,
    duration: number,
    query: string,
    errorMsg: string,
}

export default class HistoryTreeItem extends TreeItem
    implements TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: EventEmitter<HistoryTreeItem | undefined> = new EventEmitter<HistoryTreeItem | undefined>();
    readonly onDidChangeTreeData: Event<HistoryTreeItem | undefined> = this._onDidChangeTreeData.event;
    uniqLabel: string;
    query: string;
    time: Date;
    duration: number;
    _parent: TreeItem | null;
    _children: TreeItem[] = [];
    errorMsg = '';
    contextValue = 'history';
    public static currentHistoryTree: HistoryTreeItem;

    public static createHistoryTree(): HistoryTreeItem {
        if (!HistoryTreeItem.currentHistoryTree)
            HistoryTreeItem.currentHistoryTree = new HistoryTreeItem({ uniqLabel: 'root', time: new Date(), duration: 0, query: '', errorMsg: '' }, null);
        return HistoryTreeItem.currentHistoryTree;
    }

    private constructor(history: History, parent: TreeItem | null) {
        super(history.uniqLabel.replace(',', '-') + ' | ' + dayjs(history.time).format('HH:mm:ss'), TreeItemCollapsibleState.None);
        this.uniqLabel = history.uniqLabel;
        this.query = history.query;
        this.time = history.time;
        this.duration = history.duration;
        this._parent = parent;
        this.errorMsg = history.errorMsg;
        const mdString = new MarkdownString();
        mdString.appendMarkdown(`- server: ${history.uniqLabel.replace(',', '-')}\n`);
        mdString.appendMarkdown(`- time: ${dayjs(history.time).format('YYYY.MM.DD HH:mm:ss.SSS')}\n`);
        mdString.appendMarkdown(`- duration: ${history.duration}\n`);

        if (this.errorMsg) {
            mdString.appendMarkdown('- error:');
            mdString.appendCodeblock(this.errorMsg, 'q');
        } else {
            mdString.appendMarkdown('- query:');
            mdString.appendCodeblock(history.query, 'q');
        }
        this.tooltip = mdString;
    }

    refresh(): void {
        if (this._parent) {
            return;
        }
        if (this._children.length > 0) {
            this._onDidChangeTreeData.fire(undefined);
            return;
        }
        // read the q query history file from home dir
        if (fs.existsSync(historyPath)) {
            const histories: History[] = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
            this._children = histories.map(h => new HistoryTreeItem(h, HistoryTreeItem.currentHistoryTree));
            this._onDidChangeTreeData.fire(undefined);
        } else {
            if (!fs.existsSync(cfgDir)) {
                fs.mkdirSync(cfgDir);
            }
            fs.writeFileSync(historyPath, '[]', 'utf8');
        }
    }

    public static dumpHistory(): void {
        fs.writeFileSync(historyPath, JSON.stringify(HistoryTreeItem.currentHistoryTree._children, null, 4), 'utf8');
    }

    getParent(): TreeItem | null {
        return this._parent;
    }

    getTreeItem(e: HistoryTreeItem): TreeItem {
        return e;
    }

    getChildren(e?: TreeItem): Thenable<TreeItem[]> {
        if (e instanceof HistoryTreeItem) {
            return Promise.resolve(e._children);
        } else if (e) {
            return Promise.resolve([]);
        } else {
            return Promise.resolve(this._children);
        }
    }

    public static appendHistory(history: History): void {
        HistoryTreeItem.currentHistoryTree._children.unshift(new HistoryTreeItem(history, HistoryTreeItem.currentHistoryTree));
        HistoryTreeItem.currentHistoryTree.refresh();
    }

    // @ts-ignore
    get iconPath(): { light: string, dark: string } {
        if (this.errorMsg) {
            return {
                light: path.join(__filename, '../../assets/svg/light/error.svg'),
                dark: path.join(__filename, '../../assets/svg/dark/error.svg')
            };
        } else {
            return {
                light: path.join(__filename, '../../assets/svg/light/pass.svg'),
                dark: path.join(__filename, '../../assets/svg/dark/pass.svg')
            };
        }
    }


}