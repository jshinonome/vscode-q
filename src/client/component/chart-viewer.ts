/**
 * Copyright (c) 2022 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import fs from 'fs';
import path from 'path';
import { ColorThemeKind, Disposable, Uri, ViewColumn, WebviewPanel, window } from 'vscode';

const templatePath = './assets/view';

export class ChartView implements Disposable {
    public static readonly viewType = 'ChartView';
    public static extensionPath = '';
    public static current: ChartView;
    private readonly _panel: WebviewPanel;
    private readonly _extensionPath: string;
    private _disposables: Disposable[] = [];

    private _theme = '-dark';

    public static setExtensionPath(extensionPath: string): void {
        ChartView.extensionPath = extensionPath;
    }

    public static Create(bytes: number[]): void {
        if (ChartView.extensionPath === '') {
            window.showWarningMessage('Failed to Open Chart View');
        }

        if (ChartView.current) {
            ChartView.current.dispose();
        }

        const extensionPath = ChartView.extensionPath;

        const panel = window.createWebviewPanel(
            ChartView.viewType,
            'Chart View',
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

        const buff = Buffer.from(bytes);
        const base64png = buff.toString('base64');

        ChartView.current = new ChartView(panel, extensionPath, base64png);
    }

    private constructor(panel: WebviewPanel, extensionPath: string, base64png: string) {
        this._panel = panel;
        this._extensionPath = extensionPath;
        this.configure();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtmlForWebview(base64png);
        this._panel.title = 'Chart View';
        this._panel.iconPath = Uri.file(path.join(extensionPath, 'icon.png'));
    }

    private configure(): void {
        let isLightTheme = false;
        isLightTheme = window.activeColorTheme.kind === ColorThemeKind.Light;
        this._theme = isLightTheme ? '' : '-dark';
    }

    public dispose(): void {
        // Clean up our assets
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _getHtmlForWebview(base64png: string) {
        // Local path to javascript run in the webview
        const dir = Uri.file(path.join(this._extensionPath, templatePath));
        const webview = this._panel.webview;
        // And the uri we use to load this script in the webview
        const dirUri = webview.asWebviewUri(dir);
        let template = fs.readFileSync(
            path.join(this._extensionPath, templatePath, 'chart-view.html')).toString();
        template = template.replace(/{assets}/g, dirUri.toString())
            .replace(/{theme}/g, this._theme)
            .replace(/{base64}/g, base64png);
        return template;
    }

}
