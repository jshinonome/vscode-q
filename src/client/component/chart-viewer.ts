/**
 * Copyright (c) 2022 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import * as fs from 'fs';
import { ColorThemeKind, Disposable, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import path = require('path');

const templatePath = './assets/view';

export class ChartView implements Disposable {
    public static currentPanel: ChartView | undefined;
    public static readonly viewType = 'qResultGrid';
    public static extensionPath = '';
    private readonly _panel: WebviewPanel;
    private readonly _extensionPath: string;
    private _disposables: Disposable[] = [];

    private _theme = '-dark';
    public static isReady = false;

    public static setExtensionPath(extensionPath: string): void {
        ChartView.extensionPath = extensionPath;
    }

    public static Create(bytes: number[]): ChartView {
        if (ChartView.extensionPath === '') {
            window.showWarningMessage('Failed to Open Chart View');
        }
        const extensionPath = ChartView.extensionPath;
        // const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined;
        if (ChartView.currentPanel) {
            ChartView.currentPanel._panel.reveal();
            return ChartView.currentPanel;
        }

        const panel = window.createWebviewPanel(
            ChartView.viewType,
            'Chart View',
            {
                viewColumn: ViewColumn.One,
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
        ChartView.currentPanel = new ChartView(panel, extensionPath, base64png);
        ChartView.isReady = false;
        return ChartView.currentPanel;
    }

    private constructor(panel: WebviewPanel, extensionPath: string, base64png: string) {
        this._panel = panel;
        this._extensionPath = extensionPath;
        this.configure();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtmlForWebview(base64png);
        this._panel.title = 'Chart Viewer';
        this._panel.iconPath = Uri.file(path.join(extensionPath, 'icon.png'));
    }

    private configure(): void {
        let isLightTheme = false;
        isLightTheme = window.activeColorTheme.kind === ColorThemeKind.Light;
        this._theme = isLightTheme ? '' : '-dark';
    }

    public dispose(): void {
        ChartView.currentPanel = undefined;
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
