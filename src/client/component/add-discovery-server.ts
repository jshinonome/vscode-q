import fs from 'fs';
import path from 'path';
import { ColorThemeKind, Disposable, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import { discoveredProcessTag, DiscoveryServer, DiscoveryServerCfg, discoveryServerTree } from '../modules/discovery-server';

const templatePath = './assets/view';

export class AddDiscoveryServer implements Disposable {
    public static currentPanel: AddDiscoveryServer | undefined;
    public static readonly viewType = 'AddDiscoveryServer';
    public static extensionPath = '';
    private _currentServer: DiscoveryServer | null = null;
    private readonly _panel: WebviewPanel;
    private readonly _extensionPath: string;
    private _disposables: Disposable[] = [];

    private _theme = '-dark';
    public static isReady = false;

    public static setExtensionPath(extensionPath: string): void {
        AddDiscoveryServer.extensionPath = extensionPath;
    }

    public static createOrShow(): AddDiscoveryServer {
        if (AddDiscoveryServer.extensionPath === '') {
            window.showWarningMessage('Failed to Open Add Discovery Server View');
        }
        const extensionPath = AddDiscoveryServer.extensionPath;
        if (AddDiscoveryServer.currentPanel) {
            AddDiscoveryServer.currentPanel._panel.reveal();
            return AddDiscoveryServer.currentPanel;
        }

        const panel = window.createWebviewPanel(
            AddDiscoveryServer.viewType,
            'Add a Discovery Server',
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
        AddDiscoveryServer.currentPanel = new AddDiscoveryServer(panel, extensionPath);
        AddDiscoveryServer.isReady = false;
        return AddDiscoveryServer.currentPanel;
    }

    public static revive(panel: WebviewPanel, extensionPath: string): void {
        AddDiscoveryServer.currentPanel = new AddDiscoveryServer(panel, extensionPath);
    }

    private constructor(panel: WebviewPanel, extensionPath: string) {
        this._panel = panel;
        this._extensionPath = extensionPath;
        this._currentServer = null;
        this.configure();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtmlForWebview();
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.cmd) {
                case 'ready':
                    AddDiscoveryServer.isReady = true;
                    break;
                case 'updateCfg':
                    this.updateCfg(message.cfg, message.overwrite);
                    break;
            }
        });
        this._panel.title = 'Add a Discovery Server';
        this._panel.iconPath = Uri.file(path.join(extensionPath, 'icon.png'));
    }

    private configure(): void {
        let isLightTheme = false;
        isLightTheme = window.activeColorTheme.kind === ColorThemeKind.Light;
        this._theme = isLightTheme ? '' : '-dark';
    }

    public dispose(): void {
        AddDiscoveryServer.currentPanel = undefined;
        // Clean up our assets
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    public static preload(server: DiscoveryServer): void {
        if (!AddDiscoveryServer.isReady) {
            setTimeout(AddDiscoveryServer.preload, 100, server);
        } else {
            const current = AddDiscoveryServer.currentPanel as AddDiscoveryServer;
            current._currentServer = server;
            current._panel.webview.postMessage({
                url: server.url,
                user: server.user,
                password: server.password,
                useTLS: server.useTLS,
                tags: server.tags,
            });
        }
    }

    public async updateCfg(cfg: DiscoveryServerCfg, overwrite: boolean): Promise<void> {
        if (overwrite && this._currentServer) {
            discoveryServerTree.removeChildByTags(cfg.tags);
        }
        discoveryServerTree.appendChild(cfg);
        discoveryServerTree.save();
        discoveryServerTree.reload();
        this.dispose();
    }

    private _getHtmlForWebview() {
        // Local path to javascript run in the webview
        const dir = Uri.file(path.join(this._extensionPath, templatePath));
        const webview = this._panel.webview;
        // And the uri we use to load this script in the webview
        const dirUri = webview.asWebviewUri(dir);
        let template = fs.readFileSync(
            path.join(this._extensionPath, templatePath, 'add-discovery-server.html')).toString();
        template = template.replace(/{assets}/g, dirUri.toString())
            .replace(/{theme}/g, this._theme);
        return template;
    }

}
