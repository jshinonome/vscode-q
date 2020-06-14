import { WebviewPanel, Disposable, window, ViewColumn, Uri, Webview } from 'vscode';
import path = require('path');
import { QueryResult } from './query-result';

export class QueryView {
    public static currentPanel: QueryView | undefined;
    public static readonly viewType = 'qResultView';
    private readonly _panel: WebviewPanel;
    private readonly _extensionPath: string;
    private _disposables: Disposable[] = [];

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
        this.update({ type: 0, data: '' });
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
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
        const webview = this._panel.webview;
        this._panel.title = 'Query Result';
        this._panel.webview.html = this._getHtmlForWebview(
            webview, result);

    }

    private _getHtmlForWebview(webview: Webview, result: QueryResult) {

        // Local path to main script run in the webview
        // const scriptPathOnDisk = Uri.file(
        //     path.join(this._extensionPath, 'media', 'main.js')
        // );

        // And the uri we use to load this script in the webview
        // const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

        // Use a nonce to whitelist which scripts can be run
        // const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <title>Query Result</title>
            </head>
            <body>
                ${JSON.stringify(result)}
            </body>
            </html>`;
    }

}


