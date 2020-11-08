/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import * as fs from 'fs';
import { ColorThemeKind, Disposable, Uri, ViewColumn, WebviewPanel, window, workspace } from 'vscode';
import { QueryResult } from '../models/query-result';
import path = require('path');
import moment = require('moment');

const templatePath = './assets/qgrid';
type formatter = (value: any) => any;
const decimals = workspace.getConfiguration().get('q-ext.qgrid.decimals') as number;
const kdbTypeMap = new Map<string, formatter>([
    ['b', (value) => value ? '1b' : '0b'],
    // ['g', (value) => value],
    ['x', (value) => '0x' + value],
    ['h', (value) => value + 'h'],
    // ['i', (value) => value],
    // ['j', (value) => value],
    ['e', (value) => value.toFixed(decimals)],
    ['f', (value) => value.toFixed(decimals)],
    // ['c', (value) => value],
    // ['s', (value) => value],
    ['p', (value) => moment(value).format('YYYY.MM.DD[D]hh:mm:ss.SSSSSSSSS')],
    ['m', (value) => moment(value).format('YYYY.MM[m]')],
    ['d', (value) => moment(value).format('YYYY.MM.DD')],
    ['z', (value) => moment(value).format('YYYY.MM.DD[T]hh:mm:ss.SSS')],
    ['n', (value) => moment(value).format('[0D]hh:mm:ss.SSSSSSSSS')],
    ['u', (value) => moment(value).format('hh:mm')],
    ['v', (value) => moment(value).format('hh:mm:ss')],
    ['t', (value) => moment(value).format('hh:mm:ss.SSS')],
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
    public isReady = false;

    public static setExtensionPath(extensionPath: string): void {
        QueryGrid.extensionPath = extensionPath;
    }

    public static createOrShow(): QueryGrid {
        if (QueryGrid.extensionPath === '') {
            window.showWarningMessage('Failed to Create Query Grid');
        }
        const extensionPath = QueryGrid.extensionPath;
        // const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined;
        if (QueryGrid.currentPanel) {
            QueryGrid.currentPanel._panel.reveal();
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
        QueryGrid.currentPanel = new QueryGrid(panel, extensionPath);
        return QueryGrid.currentPanel;
    }

    public static revive(panel: WebviewPanel, extensionPath: string): void {
        QueryGrid.currentPanel = new QueryGrid(panel, extensionPath);
    }

    private constructor(panel: WebviewPanel, extensionPath: string) {
        this._panel = panel;
        this._extensionPath = extensionPath;
        this.configure();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtmlForWebview();
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
    }

    public update(result: QueryResult): void {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result.cols = result.meta.c.map((col: string, i: number) => {
            const colDef: { headerName: string, field: string, type?: string, cellStyle?: { 'background-color': string } } = { headerName: col, field: col };
            if ('xhijef'.includes(result.meta.t[i]))
                colDef.type = 'numericColumn';
            if (result.keys?.includes(col))
                colDef.cellStyle = { 'background-color': this._keyColor };
            return colDef;

        });
        const formatterMap = result.meta.c.reduce((o: any, k: any, i: number) => (
            {
                ...o, [k]: kdbTypeMap.get(result.meta.t[i]) ?? ((value) => value)
            }), {}
        );
        const rowData: { [key: string]: any; }[] = [];
        if (result.meta.c) {
            result.data[result.meta.c[0]].forEach(
                (_v: any, i: number) => {
                    const row = {} as { [key: string]: any };
                    result.meta.c.forEach(
                        (col: string) => row[col] = formatterMap[col](result.data[col][i])
                    );
                    rowData.push(row);
                });
        }
        result.data = rowData;
        this._panel.webview.postMessage(result);
    }

    private _getHtmlForWebview() {
        // Local path to javascript run in the webview
        const dir = Uri.file(path.join(this._extensionPath, templatePath));
        const webview = this._panel.webview;
        // And the uri we use to load this script in the webview
        const dirUri = webview.asWebviewUri(dir);
        let template = fs.readFileSync(
            path.join(this._extensionPath, templatePath, 'index.html')).toString();
        template = template.replace(/{assets}/g, dirUri.toString())
            .replace(/{theme}/g, this._theme);
        return template;
    }

}


