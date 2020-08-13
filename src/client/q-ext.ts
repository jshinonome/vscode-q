/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import * as fs from 'fs';
import { homedir } from 'os';
import {
    commands, ExtensionContext, IndentAction, languages,
    Range, TextDocument, TextEdit,
    TreeItem, WebviewPanel, window,
    workspace
} from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient';
import QDictTreeItem from './items/q-dict';
import { qCfgInput } from './modules/q-cfg-input';
import { QConn } from './modules/q-conn';
import { QConnManager } from './modules/q-conn-manager';
import { semanticTokensProvider } from './modules/q-semantic-token';
import { QServerTreeProvider } from './modules/q-server-tree';
import { QStatusBarManager } from './modules/q-status-bar-manager';
import { QueryConsole } from './modules/query-console';
import { QueryView } from './modules/query-view';
import path = require('path');



export function activate(context: ExtensionContext): void {

    // extra language configurations
    languages.setLanguageConfiguration('q', {
        onEnterRules: [
            {
                // eslint-disable-next-line no-useless-escape
                beforeText: /^(?!\s+).*[\(\[{].*$/,
                afterText: /^[)}\]]/,
                action: {
                    indentAction: IndentAction.None,
                    appendText: '\n '
                }
            },
            {
                // eslint-disable-next-line no-useless-escape
                beforeText: /^\s[)}\]];?$/,
                action: {
                    indentAction: IndentAction.Outdent
                }
            },
            {
                // eslint-disable-next-line no-useless-escape
                beforeText: /^\/.*$/,
                action: {
                    indentAction: IndentAction.None,
                    appendText: '/ '
                }
            }
        ]
    });

    // append space to start [,(,{
    languages.registerDocumentFormattingEditProvider('q', {
        provideDocumentFormattingEdits(document: TextDocument): TextEdit[] {
            const textEdit: TextEdit[] = [];
            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                if (line.isEmptyOrWhitespace) {
                    continue;
                }

                if (line.text.match('^[)\\]}]')) {
                    textEdit.push(TextEdit.insert(line.range.start, ' '));
                }
            }
            return textEdit;
        }
    });

    // <-- init
    QStatusBarManager.create(context);
    QStatusBarManager.updateConnStatus(undefined);
    QStatusBarManager.updateModeStatus();
    // q-server-explorer
    const qServers = new QServerTreeProvider();
    const qRoot = new QDictTreeItem('root', null);
    window.registerTreeDataProvider('q-servers', qServers);
    window.registerTreeDataProvider('q-explorer', qRoot);
    QueryConsole.createOrShow();
    QueryView.setExtensionPath(context.extensionPath);
    // --> init


    // <-- configuration
    const queryMode = workspace.getConfiguration().get('q-ext.queryMode');
    if (queryMode === 'Console') {
        QConnManager.toggleMode();
        // QueryView.createOrShow();
        QStatusBarManager.updateModeStatus();
        QStatusBarManager.updateConnStatusColor();
    }
    const qServerCfg = workspace.getConfiguration('q-ser');
    const qServerCfgPath = homedir() + '/.vscode/q-lang-server-cfg.json';
    fs.writeFileSync(qServerCfgPath, JSON.stringify(qServerCfg), 'utf-8');
    // -->

    commands.registerCommand(
        'q-servers.refreshEntry', () => qServers.refresh());

    // q cfg input
    commands.registerCommand(
        'q-servers.addEntry',
        async () => {
            const qcfg = await qCfgInput(undefined);
            qServers.qConnManager.addCfg(qcfg);
        });

    commands.registerCommand(
        'q-servers.editEntry',
        async (qConn: QConn) => {
            const qcfg = await qCfgInput(qConn, false);
            qServers.qConnManager.addCfg(qcfg);

        });

    commands.registerCommand(
        'q-servers.deleteEntry',
        (qConn: QConn) => {
            window.showInputBox(
                { prompt: `Confirm to Remove Server '${qConn.label}' (Y/n)` }
            ).then(value => {
                if (value === 'Y') {
                    qServers.qConnManager.removeCfg(qConn.label);

                }
            });
        });

    commands.registerCommand(
        'q-servers.connect',
        label => {
            qServers.qConnManager.connect(label);
        });

    commands.registerCommand(
        'q-servers.toggleMode',
        () => {
            QConnManager.toggleMode();
            if (QConnManager.consoleMode) {
                window.showInformationMessage('Switch to Query Console Mode');
                QueryView.currentPanel?.dispose();
            } else {
                QueryView.createOrShow();
                window.showInformationMessage('Switch to Query View Mode');
            }
            QStatusBarManager.updateModeStatus();
            QStatusBarManager.updateConnStatusColor();
        });

    commands.registerCommand(
        'q-servers.toggleLimitQuery',
        () => {
            QConnManager.current?.toggleLimitQuery();
        });

    commands.registerCommand(
        'q-explorer.refreshEntry', () => qRoot.refresh());

    commands.registerCommand('q-explorer.insert', (item: TreeItem) => {
        const p = window.activeTextEditor?.selection.start;
        if (p)
            window.activeTextEditor?.edit(e => e.insert(p, item.label ?? ''));
    });

    commands.registerCommand('q-explorer.click', label => {
        console.log(label);
    });

    context.subscriptions.push(
        commands.registerCommand('q-servers.queryCurrentLine', () => {
            const n = window.activeTextEditor?.selection.active.line;
            if (n) {
                const query = window.activeTextEditor?.document.lineAt(n).text;
                if (query) {
                    qServers.qConnManager.sync(query);
                }
            }
        })
    );

    context.subscriptions.push(
        commands.registerCommand('q-servers.querySelection', () => {
            const query = window.activeTextEditor?.document.getText(
                new Range(window.activeTextEditor.selection.start, window.activeTextEditor.selection.end)
            );
            if (query) {
                qServers.qConnManager.sync(query);
            }
        })
    );

    if (window.registerWebviewPanelSerializer) {
        // Make sure we register a serializer in activation event
        window.registerWebviewPanelSerializer(QueryView.viewType, {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async deserializeWebviewPanel(webviewPanel: WebviewPanel) {
                QueryView.revive(webviewPanel, context.extensionPath);
            }
        });
    }

    context.subscriptions.push(semanticTokensProvider);


    workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('q-ext') || e.affectsConfiguration('q-ser')) {
            window.showInformationMessage('Reload/Restart vscode to Making the Configuration Take Effect.');
        }
    });

    // q language server
    const qls = path.join(context.extensionPath, 'dist', 'q-ser.js');

    // The debug options for the server
    // runs the server in Node's Inspector mode for debugging
    const debugOptions = { execArgv: ['--nolazy', '--inspect=6018'] };

    // If launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: qls, transport: TransportKind.ipc },
        debug: {
            module: qls,
            transport: TransportKind.ipc,
            options: debugOptions
        }
    };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        // Register the server for plain text documents
        documentSelector: [{ scheme: 'file', language: 'q' }],
        synchronize: {
            // Notify the server about q file changes
            fileEvents: workspace.createFileSystemWatcher('**/src/**/*.q')
        }
    };

    // Create the language client and start the client.
    const client = new LanguageClient(
        'qLangServer',
        'q Language Server',
        serverOptions,
        clientOptions
    );

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(client.start());

    context.subscriptions.push(
        commands.registerCommand('q-servers.sendServerCache', code => {
            client.sendNotification('$/analyze-server-cache', code);
        })
    );
}

export function deactivate(): void {
    QueryView.currentPanel?.dispose();
}
