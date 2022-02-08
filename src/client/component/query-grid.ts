/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import * as fs from 'fs/promises';
import { ColorThemeKind, Disposable, Uri, ViewColumn, WebviewPanel, window, workspace } from 'vscode';
import { QueryResult } from '../models/query-result';
import { QConnManager } from '../modules/q-conn-manager';
import path = require('path');
import dayjs = require('dayjs');
import utc = require('dayjs/plugin/utc');

dayjs.extend(utc);

const templatePath = './assets/view';
type formatter = (value: any) => any;
const decimals = workspace.getConfiguration().get('q-client.queryGrid.decimals') as number;
export const kdbTypeMap = new Map<string, formatter>([
    ['b', (value) => value ? '1b' : '0b'],
    ['x', (value) => '0x' + value],
    ['h', (value) => value + 'h'],
    ['e', (value) => value ? value.toFixed(decimals) : value],
    ['f', (value) => value ? value.toFixed(decimals) : value],
    // Nanoseconds is not native supported in javascript
    ['p', (value) => dayjs.utc(value).format('YYYY-MM-DD[T]HH:mm:ss.SSS')],
    ['m', (value) => dayjs.utc(value).format('YYYY-MM')],
    ['d', (value) => dayjs.utc(value).format('YYYY-MM-DD')],
    ['z', (value) => dayjs.utc(value).format('YYYY-MM-DD[T]HH:mm:ss.SSS')],
    ['n', (value) => dayjs.utc(value).format('HH:mm:ss.SSS')],
    ['u', (value) => dayjs.utc(value).format('HH:mm')],
    ['v', (value) => dayjs.utc(value).format('HH:mm:ss')],
    ['t', (value) => dayjs.utc(value).format('HH:mm:ss.SSS')],
    [' ', (value) => JSON.stringify(value)]
]);

export class QueryGrid implements Disposable {
    public static currentPanel: QueryGrid | undefined;
    public static readonly viewType = 'qResultGrid';
    public static extensionPath = '';
    private readonly _panel: WebviewPanel;
    private readonly _extensionPath: string;
    private _disposables: Disposable[] = [];

    private _theme = '-dark';
    private _keyColor = '#6A1B9A';
    public static isReady = false;

    public static setExtensionPath(extensionPath: string): void {
        QueryGrid.extensionPath = extensionPath;
    }

    public static async createOrShow(): Promise<QueryGrid> {
        if (QueryGrid.extensionPath === '') {
            window.showWarningMessage('Failed to Create Query Grid');
        }
        const extensionPath = QueryGrid.extensionPath;

        if (QueryGrid.currentPanel) {
            return QueryGrid.currentPanel;
        }

        const panel = window.createWebviewPanel(
            QueryGrid.viewType,
            'Query Grid',
            {
                viewColumn: ViewColumn.Two,
                preserveFocus: true,
            },
            {
                // Enable javascript in the webview
                enableScripts: true,
                retainContextWhenHidden: true,
                // And restrict the webview to only loading content from assets directory.
                localResourceRoots: [Uri.file(path.join(extensionPath, 'assets'))]
            }
        );
        QueryGrid.currentPanel = await this.revive(panel, extensionPath);
        QueryGrid.isReady = false;
        return QueryGrid.currentPanel;
    }

    public static async revive(panel: WebviewPanel, extensionPath: string) {
        QueryGrid.currentPanel = new QueryGrid(panel, extensionPath);
        QueryGrid.currentPanel._panel.webview.html = await QueryGrid.currentPanel._getHtmlForWebview();
        return QueryGrid.currentPanel;
    }

    private constructor(panel: WebviewPanel, extensionPath: string) {
        this._panel = panel;
        this._extensionPath = extensionPath;
        this.configure();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.cmd) {
                case 'ready':
                    QueryGrid.isReady = true;
                    break;
                case 'startPolling':
                    QConnManager.current?.startPolling(message.interval, message.query);
                    break;
                case 'stopPolling':
                    QConnManager.current?.stopPolling();
                    break;
            }
        });
        this._panel.title = 'Query Grid';
        this._panel.iconPath = Uri.file(path.join(extensionPath, 'icon.png'));
    }

    private configure(): void {
        let isLightTheme = false;
        isLightTheme = window.activeColorTheme.kind === ColorThemeKind.Light;
        this._theme = isLightTheme ? '' : '-dark';
        this._keyColor = isLightTheme ? '#E1BEE7' : '#6A1B9A';
    }

    public dispose(): void {
        QueryGrid.currentPanel = undefined;
        // Clean up our assets
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
        QConnManager.current?.stopPolling();
    }

    public static update(result: QueryResult): void {
        if (!QueryGrid.isReady) {
            setTimeout(QueryGrid.update, 100, result);
        } else {
            const current = QueryGrid.currentPanel as QueryGrid;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const numericCols: string[] = [];
            let labelCol = '';
            result.cols = result.meta.c.map((col: string, i: number) => {
                const colDef: { headerName: string, field: string, type?: string, cellStyle?: { 'background-color': string } } = { headerName: col, field: col };
                if ('xhijef'.includes(result.meta.t[i])) {
                    colDef.type = 'numericColumn';
                    numericCols.push(result.meta.c[i]);
                } else if (!labelCol) {
                    labelCol = result.meta.c[i];
                }
                if (result.keys?.includes(col))
                    colDef.cellStyle = { 'background-color': current._keyColor };
                return colDef;
            });
            // temporal types has been converted to string
            const formatterMap = result.meta.c.reduce((o: any, k: any, i: number) => (
                {
                    ...o, [k]: kdbTypeMap.get(result.meta.t[i]) ?? ((value) => value)
                }), {}
            );
            const data = result.meta.c.map(
                (col: string) => {
                    // deal with char column
                    if (typeof result.data[col] === 'string') {
                        return { [col]: result.data[col].split('') };
                    } else {
                        return { [col]: result.data[col].map(formatterMap[col]) };
                    }
                }
            );
            result.data = Object.assign({}, ...data);
            result.labelCol = labelCol;
            result.numericCols = numericCols;
            current._panel.webview.postMessage(result);
        }
    }

    private async _getHtmlForWebview() {
        // Local path to javascript run in the webview
        const dir = Uri.file(path.join(this._extensionPath, templatePath));
        const webview = this._panel.webview;
        // And the uri we use to load this script in the webview
        const dirUri = webview.asWebviewUri(dir);
        const template = await fs.readFile(
            path.join(this._extensionPath, templatePath, 'query-grid.html'));
        return template.toString()
            .replace(/{assets}/g, dirUri.toString())
            .replace(/{theme}/g, this._theme);
    }

}
