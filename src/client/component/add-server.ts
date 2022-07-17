import fs from 'fs';
import path from 'path';
import { ColorThemeKind, Disposable, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import { QConn } from '../modules/q-conn';
import { QCfg, QConnManager } from '../modules/q-conn-manager';

const templatePath = './assets/view';

export class AddServer implements Disposable {
    public static currentPanel: AddServer | undefined;
    public static readonly viewType = 'AddServer';
    public static extensionPath = '';
    private _currentQCfg: QCfg | null = null;
    private readonly _panel: WebviewPanel;
    private readonly _extensionPath: string;
    private _disposables: Disposable[] = [];

    private _theme = '-dark';
    public static isReady = false;

    public static setExtensionPath(extensionPath: string): void {
        AddServer.extensionPath = extensionPath;
    }

    public static createOrShow(): AddServer {
        if (AddServer.extensionPath === '') {
            window.showWarningMessage('Failed to Open Add Server View');
        }
        const extensionPath = AddServer.extensionPath;
        // const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined;
        if (AddServer.currentPanel) {
            AddServer.currentPanel._panel.reveal();
            return AddServer.currentPanel;
        }

        const panel = window.createWebviewPanel(
            AddServer.viewType,
            'Add a Server',
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
        AddServer.currentPanel = new AddServer(panel, extensionPath);
        AddServer.isReady = false;
        return AddServer.currentPanel;
    }

    public static revive(panel: WebviewPanel, extensionPath: string): void {
        AddServer.currentPanel = new AddServer(panel, extensionPath);
    }

    private constructor(panel: WebviewPanel, extensionPath: string) {
        this._panel = panel;
        this._extensionPath = extensionPath;
        this._currentQCfg = null;
        this.configure();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtmlForWebview();
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.cmd) {
                case 'ready':
                    AddServer.isReady = true;
                    break;
                case 'updateCfg':
                    this.updateServerCfg(message.cfg, message.overwrite);
                    break;
            }
        });
        this._panel.title = 'Add a Server';
        this._panel.iconPath = Uri.file(path.join(extensionPath, 'icon.png'));
    }

    private configure(): void {
        let isLightTheme = false;
        isLightTheme = window.activeColorTheme.kind === ColorThemeKind.Light;
        this._theme = isLightTheme ? '' : '-dark';
    }

    public dispose(): void {
        AddServer.currentPanel = undefined;
        // Clean up our assets
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    public static update(qcfg: QCfg): void {
        if (!AddServer.isReady) {
            setTimeout(AddServer.update, 100, qcfg);
        } else {
            const current = AddServer.currentPanel as AddServer;
            current._currentQCfg = qcfg;
            current._panel.webview.postMessage({
                host: qcfg.host,
                port: qcfg.port,
                user: qcfg.user,
                password: qcfg.password,
                useTLS: qcfg.useTLS,
                label: qcfg.label,
                tags: qcfg.tags,
                uniqLabel: qcfg.uniqLabel,
                useCustomizedAuth: qcfg.useCustomizedAuth
            });

        }
    }

    public async updateServerCfg(qcfg: QCfg, overwrite: boolean): Promise<void> {
        console.log('update server configuration called');
        if (overwrite && this._currentQCfg) {
            QConnManager.current?.removeCfg(this._currentQCfg.uniqLabel);
        }
        QConnManager.current?.addCfg(qcfg);
        this.dispose();
    }

    private _getHtmlForWebview() {
        // Local path to javascript run in the webview
        const dir = Uri.file(path.join(this._extensionPath, templatePath));
        const webview = this._panel.webview;
        // And the uri we use to load this script in the webview
        const dirUri = webview.asWebviewUri(dir);
        let template = fs.readFileSync(
            path.join(this._extensionPath, templatePath, 'add-server.html')).toString();
        const customizedAuthInstalled = QConn.customizedAuthInstalled ? 'checked' : 'disabled';
        template = template.replace(/{assets}/g, dirUri.toString())
            .replace(/{theme}/g, this._theme)
            .replace(/{customizedAuthInstalled}/g, customizedAuthInstalled);
        return template;
    }

}
