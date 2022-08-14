import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import fs from 'fs';
import path from 'path';
import { ColorThemeKind, Disposable, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import { QueryResult } from '../modules/query-result';
import { kTypeMap } from '../util/k-map';

dayjs.extend(utc);

const templatePath = './assets/query-view';

export class QueryView implements Disposable {
    public static currentPanel: QueryView | undefined;
    public static readonly viewType = 'qResultView';
    public static extensionPath = '';
    private readonly _panel: WebviewPanel;
    private readonly _extensionPath: string;
    private _disposables: Disposable[] = [];

    private _theme = '';
    private _dataViewBg = '#2f3136;';
    private _keyColor = '#6A1B9A';
    public static isReady = false;

    public static setExtensionPath(extensionPath: string): void {
        QueryView.extensionPath = extensionPath;
    }

    public static createOrShow(): QueryView {
        if (QueryView.extensionPath === '') {
            window.showWarningMessage('Failed to Create Query View');
        }
        const extensionPath = QueryView.extensionPath;

        if (QueryView.currentPanel) {
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
        QueryView.isReady = false;
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
                    QueryView.isReady = true;
                    break;
            }
        });
        this._panel.webview.html = this._getHtmlForWebview();
        this._panel.title = 'Query View';
        this._panel.iconPath = Uri.file(path.join(extensionPath, 'icon.png'));
    }

    private configure(): void {
        let isLightTheme = false;
        isLightTheme = window.activeColorTheme.kind === ColorThemeKind.Light;
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

    public static update(result: QueryResult): void {
        if (!QueryView.isReady) {
            setTimeout(QueryView.update, 500, result);
        } else {
            const current = QueryView.currentPanel as QueryView;
            const meta = result.meta;
            if (meta) {
                result.cols = meta.c;
                // convert temporal types, timezone adjustment is handled on web view side
                [...meta.t].forEach((type: string, i: number) => {
                    if ('pmdznuvt'.includes(type)) {
                        const column = meta.c[i];
                        result.data[column] = result.data[column].map(
                            (date: Date) => date ? date.toISOString() : date);
                    } else if (type === ' ') {
                        const column = meta.c[i];
                        result.data[column] = result.data[column].map(JSON.stringify);
                    }
                });
                const newMeta = meta.c.reduce(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (o: any, k: any, i: number) => ({ ...o, [k]: kTypeMap.get(meta.t[i]) ?? 'string' }), {}
                );
                result.meta = newMeta;
                current._panel.webview.postMessage(result);
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
            .replace(/{keyColor}/g, this._keyColor);

        return template;
    }

}
