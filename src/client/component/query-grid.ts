import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import fs from 'fs';
import path from 'path';
import { ColorThemeKind, Disposable, Uri, ViewColumn, WebviewPanel, window, workspace } from 'vscode';
import { QConnManager } from '../modules/q-conn-manager';
import { QueryResult } from '../modules/query-result';

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

    public static createOrShow(): QueryGrid {
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
        QueryGrid.currentPanel = new QueryGrid(panel, extensionPath);
        QueryGrid.isReady = false;
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
        } else if (result.meta) {
            const current = QueryGrid.currentPanel as QueryGrid;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const numericCols: string[] = [];
            const meta = result.meta;
            let labelCol = '';
            result.cols = meta.c.map((col: string, i: number) => {
                const colDef: { headerName: string, field: string, type?: string, cellStyle?: { 'background-color': string } } = { headerName: col, field: col };
                if ('xhijef'.includes(meta.t[i])) {
                    colDef.type = 'numericColumn';
                    numericCols.push(meta.c[i]);
                } else if (!labelCol) {
                    labelCol = meta.c[i];
                }
                if (result.keys?.includes(col))
                    colDef.cellStyle = { 'background-color': current._keyColor };
                return colDef;
            });
            // temporal types has been converted to string
            const formatterMap = meta.c.reduce((o: any, k: any, i: number) => (
                {
                    ...o, [k]: kdbTypeMap.get(meta.t[i]) ?? ((value) => value)
                }), {}
            );
            const data = meta.c.map(
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

    private _getHtmlForWebview() {
        // Local path to javascript run in the webview
        const dir = Uri.file(path.join(this._extensionPath, templatePath));
        const webview = this._panel.webview;
        // And the uri we use to load this script in the webview
        const dirUri = webview.asWebviewUri(dir);
        let template = fs.readFileSync(
            path.join(this._extensionPath, templatePath, 'query-grid.html')).toString();
        template = template.replace(/{assets}/g, dirUri.toString())
            .replace(/{theme}/g, this._theme);
        return template;
    }

}
