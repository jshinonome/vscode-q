import { WebviewPanel, Disposable, window, ViewColumn, Uri, Webview } from 'vscode';
import path = require('path');
import { QueryResult } from './query-result';
import * as fs from 'fs';

const templatePath = './media/qview';

export class QueryView {
    public static currentPanel: QueryView | undefined;
    public static readonly viewType = 'qResultView';
    private readonly _panel: WebviewPanel;
    private readonly _extensionPath: string;
    private _disposables: Disposable[] = [];
    private _template = '';

    public static createOrShow(extensionPath: string): void {
        const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined;
        if (QueryView.currentPanel) {
            QueryView.currentPanel._panel.reveal(column);
            return;
        }

        const panel = window.createWebviewPanel(
            QueryView.viewType,
            'Query Result',
            {
                viewColumn: ViewColumn.Two,
                preserveFocus: true,
            },
            {
                // Enable javascript in the webview
                enableScripts: true,
                // And restrict the webview to only loading content from media directory.
                localResourceRoots: [Uri.file(path.join(extensionPath, 'media'))]
            }
        );
        QueryView.currentPanel = new QueryView(panel, extensionPath);
    }

    public static revive(panel: WebviewPanel, extensionPath: string): void {
        QueryView.currentPanel = new QueryView(panel, extensionPath);
    }

    private constructor(panel: WebviewPanel, extensionPath: string) {
        this._panel = panel;
        this._extensionPath = extensionPath;
        // Set the webview's initial html content
        this.update({ type: 0, data: '', cols: [] });
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._template = this._getHtmlForWebview();
    }

    public dispose(): void {
        QueryView.currentPanel = undefined;
        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    public update(result: QueryResult): void {
        this._panel.title = 'Query Result';
        this._panel.webview.html = this._template;
        this._panel.webview.postMessage(result);
    }

    private _getHtmlForWebview() {
        // Local path to javascript run in the webview
        const tableJsFile = Uri.file(
            path.join(this._extensionPath, templatePath, 'tabulator.min.js')
        );
        const tableCssFile = Uri.file(
            path.join(this._extensionPath, templatePath, 'tabulator.min.css')
        );
        const frameJsFile = Uri.file(
            path.join(this._extensionPath, templatePath, 'bootstrap.min.js')
        );
        const frameCssFile = Uri.file(
            path.join(this._extensionPath, templatePath, 'bootstrap.min.css')
        );
        const webview = this._panel.webview;
        // And the uri we use to load this script in the webview
        const tableJsUri = webview.asWebviewUri(tableJsFile);
        const tableCssUri = webview.asWebviewUri(tableCssFile);
        const frameJsUri = webview.asWebviewUri(frameJsFile);
        const frameCssUri = webview.asWebviewUri(frameCssFile);

        let template = fs.readFileSync(
            path.join(this._extensionPath, templatePath, 'main.html')).toString();

        template = template.replace('{table-js}', tableJsUri.toString());
        template = template.replace('{table-css}', tableCssUri.toString());
        template = template.replace('{frame-js}', frameJsUri.toString());
        template = template.replace('{frame-css}', frameCssUri.toString());
        this._template = template;
        return template;
    }

}


