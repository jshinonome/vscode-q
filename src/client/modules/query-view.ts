/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import * as fs from 'fs';
import { ColorThemeKind, Disposable, Uri, ViewColumn, WebviewPanel, window, workspace } from 'vscode';
import * as xlsx from 'xlsx';
import { QueryResult } from '../models/query-result';
import { kTypeMap } from '../util/k-map';
import path = require('path');
import moment = require('moment');

const templatePath = './assets/qview';

export class QueryView implements Disposable {
    public static currentPanel: QueryView | undefined;
    public static readonly viewType = 'qResultView';
    public static extensionPath = '';
    private readonly _panel: WebviewPanel;
    private readonly _extensionPath: string;
    private _disposables: Disposable[] = [];

    private _cssTheme = 'material.dark';
    private _theme = '';
    private _dataViewBg = '#2f3136;'
    private _keyColor = '#6A1B9A';
    public isReady = false;

    public static setExtensionPath(extensionPath: string): void {
        QueryView.extensionPath = extensionPath;
    }

    public static createOrShow(): QueryView {
        if (QueryView.extensionPath === '') {
            window.showWarningMessage('Failed to Create Query View');
        }
        const extensionPath = QueryView.extensionPath;
        // const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined;
        if (QueryView.currentPanel) {
            QueryView.currentPanel._panel.reveal();
            return QueryView.currentPanel;
        }

        const panel = window.createWebviewPanel(
            QueryView.viewType,
            'Query View',
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
        QueryView.currentPanel = new QueryView(panel, extensionPath);
        return QueryView.currentPanel;
    }

    public static revive(panel: WebviewPanel, extensionPath: string): void {
        QueryView.currentPanel = new QueryView(panel, extensionPath);
    }

    private constructor(panel: WebviewPanel, extensionPath: string) {
        this._panel = panel;
        this._extensionPath = extensionPath;
        this.configure();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.cmd) {
                case 'ready':
                    this.isReady = true;
                    break;
                case 'saveData':
                    this.saveData(message.data, message.fileType);
                    break;
            }
        });
        this._panel.webview.html = this._getHtmlForWebview();
        this._panel.title = 'Query View';
        this._panel.iconPath = Uri.file(path.join(extensionPath, 'icon.png'));
    }

    private configure(): void {
        const cfg = workspace.getConfiguration('q-client.qview');
        let isLightTheme = false;
        isLightTheme = window.activeColorTheme.kind === ColorThemeKind.Light;
        this._cssTheme = cfg.dense ? 'material-dense' : 'material';
        this._cssTheme = isLightTheme ? this._cssTheme : this._cssTheme + '.dark';
        this._theme = isLightTheme ? '' : '-dark';
        this._keyColor = isLightTheme ? '#E1BEE7' : '#6A1B9A';
        this._dataViewBg = isLightTheme ? '#eeeeee' : this._dataViewBg;
    }

    public dispose(): void {
        QueryView.currentPanel = undefined;
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
        const meta = result.meta.c.reduce((o: any, k: any, i: number) => ({ ...o, [k]: kTypeMap.get(result.meta.t[i]) ?? 'string' }), {});
        result.meta = meta;
        this._panel.webview.postMessage(result);
    }

    public async saveData(data: any, fileType: string): Promise<void> {
        console.log('save data called');
        const fileName = `query-view-${moment().format('YYYYMMDD')}${fileType}`;
        if (!workspace.workspaceFolders) {
            return;
        }
        const workspaceFolder = workspace.workspaceFolders[0].uri.fsPath;
        const filePath = path.join(workspaceFolder, fileName);
        const fileUri = await window.showSaveDialog({
            defaultUri: Uri.parse(filePath).with({ scheme: 'file' })
        });

        if (fileUri) {
            if (fileType === '.csv') {
                fs.writeFile(fileUri.fsPath, data, err => console.log(err));
            }
            else if (fileType === '.xlsx') {
                const workbook = xlsx.utils.book_new();
                const worksheet = xlsx.utils.json_to_sheet(data);
                xlsx.utils.book_append_sheet(workbook, worksheet, 'q-ext');
                const fileData = xlsx.write(workbook, {
                    type: 'buffer',
                    compression: true,
                    bookType: 'xlsx'
                });
                fs.writeFile(filePath, fileData, err => console.log(err));

            } else {
                console.log('unsupported file type');
            }
        }
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
            .replace(/{theme}/g, this._theme)
            .replace(/{cssTheme}/g, this._cssTheme)
            .replace(/{keyColor}/g, this._keyColor);

        return template;
    }

}


