/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import {
    commands, ExtensionContext, IndentAction, languages,
    Range, TextDocument, TextEdit,
    TreeItem, WebviewPanel, window,
    workspace
} from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient';
import QDictTreeItem from './items/q-dict';
import QFunctionTreeItem from './items/q-function';
import { qCfgInput } from './modules/q-cfg-input';
import { QConn } from './modules/q-conn';
import { QConnManager } from './modules/q-conn-manager';
import { semanticTokensProvider } from './modules/q-semantic-token';
import { QServerTree } from './modules/q-server-tree';
import { QStatusBarManager } from './modules/q-status-bar-manager';
import { runQFile, sendToCurrentTerm } from './modules/q-term';
import { QueryConsole } from './modules/query-console';
import { QueryGrid } from './modules/query-grid';
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
    // q-server-explorer
    const qServers = new QServerTree('root', null);
    const qRoot = new QDictTreeItem('root', null);
    window.registerTreeDataProvider('q-servers', qServers);
    window.registerTreeDataProvider('q-explorer', qRoot);
    qServers.refresh();
    QueryConsole.createOrShow();
    QueryView.setExtensionPath(context.extensionPath);
    QueryGrid.setExtensionPath(context.extensionPath);
    // --> init


    // <-- configuration
    const queryMode = workspace.getConfiguration().get('q-ext.queryMode');
    QConnManager.setQueryMode(queryMode as string);
    // -->

    commands.registerCommand(
        'q-servers.refreshEntry', () => qServers.refresh());

    // q cfg input
    commands.registerCommand(
        'q-servers.addEntry',
        async () => {
            const qcfg = await qCfgInput(undefined);
            QConnManager.current?.addCfg(qcfg);
        });

    commands.registerCommand(
        'q-servers.editEntry',
        async (qConn: QConn) => {
            const qcfg = await qCfgInput(qConn, false);
            QConnManager.current?.addCfg(qcfg);
        });

    commands.registerCommand(
        'q-servers.deleteEntry',
        (qConn: QConn) => {
            window.showInputBox(
                { prompt: `Confirm to Remove Server '${qConn.label}' (Y/n)` }
            ).then(value => {
                if (value === 'Y') {
                    QConnManager.current?.removeCfg(qConn.label);

                }
            });
        });

    commands.registerCommand(
        'q-servers.connect',
        uniqLabel => {
            QConnManager.current?.connect(uniqLabel);
        });

    commands.registerCommand(
        'q-servers.tagEntry',
        async (qConn: QConn) => {
            qConn.tags = await window.showInputBox({
                prompt: `Tags for '${qConn.label}' separate by ',' (e.g. 'dev,quant,tca')`
            }) ?? '';
            QConnManager.current?.addCfg(qConn);
        });

    commands.registerCommand(
        'q-servers.switchMode',
        async () => {
            const mode = await window.showQuickPick(['Console', 'Grid', 'Virtualization'],
                { placeHolder: 'Please choose a query mode from the list below' });
            window.showInformationMessage(`Switch to Query ${mode} Mode`);
            if (mode) QConnManager.setQueryMode(mode);
        });

    commands.registerCommand(
        'q-servers.toggleLimitQuery',
        () => {
            QConnManager.current?.toggleLimitQuery();
        });

    commands.registerCommand(
        'q-servers.abortQuery',
        () => {
            QConnManager.current?.abortQuery();
        });

    commands.registerCommand(
        'q-servers.exportServers',
        () => {
            QConnManager.current?.exportCfg();
        });

    commands.registerCommand(
        'q-servers.importServers',
        () => {
            QConnManager.current?.importCfg();
        });


    commands.registerCommand(
        'q-explorer.refreshEntry', () => qRoot.refresh());

    const previewQueryLimit = workspace.getConfiguration().get('q-ext.expl.prevQueryLimit');

    commands.registerCommand('q-explorer.preview', (item: TreeItem) => {
        switch (item.contextValue) {
            case 'qtable':
                QConnManager.current?.sync(`{[t;l]$[t in .Q.pt;select from t where date=last date, i<l;select from t where i<l]}[\`${item.label};${previewQueryLimit}]`);
                break;
            case 'qfunction':
                QueryConsole.current?.append((item as QFunctionTreeItem).getBody(), 0, 'cached');
                break;
            default:
                if (item.label)
                    QConnManager.current?.sync(item.label);
        }
    });

    commands.registerCommand('q-explorer.click', label => {
        console.log(label);
    });

    context.subscriptions.push(
        commands.registerCommand('q-servers.queryCurrentLine', () => {
            if (window.activeTextEditor) {
                const n = window.activeTextEditor.selection.active.line;
                const query = window.activeTextEditor.document.lineAt(n).text;
                if (query) {
                    QConnManager.current?.sync(query);
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
                QConnManager.current?.sync(query);
            }
        })
    );

    context.subscriptions.push(
        commands.registerCommand('q-term.sendCurrentLine', () => {
            if (window.activeTextEditor) {
                const n = window.activeTextEditor.selection.active.line;
                const query = window.activeTextEditor.document.lineAt(n).text;
                if (query) {
                    sendToCurrentTerm(query);
                }
            }
        })
    );

    context.subscriptions.push(
        commands.registerCommand('q-term.sendSelection', () => {
            const query = window.activeTextEditor?.document.getText(
                new Range(window.activeTextEditor.selection.start, window.activeTextEditor.selection.end)
            );
            if (query) {
                sendToCurrentTerm(query.replace(/(\r\n|\n|\r)/gm, ''));
            }
        })
    );

    context.subscriptions.push(
        commands.registerCommand('q-term.runQFile', () => {
            const filepath = window.activeTextEditor?.document.fileName;
            if (filepath)
                runQFile(filepath);
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
        if (e.affectsConfiguration('q-ext') && !e.affectsConfiguration('q-ext.term')) {
            window.showInformationMessage('Reload/Restart vscode to Making the Configuration Take Effect.');
        } else if (e.affectsConfiguration('q-ser')) {
            const cfg = workspace.getConfiguration('q-ser.src');
            client.sendNotification('$/analyze-source-code', { globsPattern: cfg.get('globsPattern'), ignorePattern: cfg.get('ignorePattern') });
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
            fileEvents: workspace.createFileSystemWatcher('**/*.q')
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

    client.onReady().then(() => {
        const cfg = workspace.getConfiguration('q-ser.src');
        client.sendNotification('$/analyze-source-code', { globsPattern: cfg.get('globsPattern'), ignorePattern: cfg.get('ignorePattern') });
    });
}

export function deactivate(): void {
    QueryView.currentPanel?.dispose();
}
