/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import {
    commands, env, ExtensionContext, IndentAction, languages, QuickPickItem, Range, Selection, TextDocument, TextEdit, TreeItem, Uri, WebviewPanel, window, workspace
} from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { AddServer } from './component/add-server';
import { QueryGrid } from './component/query-grid';
import { QueryView } from './component/query-view';
import HistoryTreeItem from './items/history';
import QDictTreeItem from './items/q-dict';
import QFunctionTreeItem from './items/q-function';
import { QConn } from './modules/q-conn';
import { QConnManager } from './modules/q-conn-manager';
import { QServerTree } from './modules/q-server-tree';
import { QStatusBarManager } from './modules/q-status-bar-manager';
import { runQFile, sendToCurrentTerm } from './modules/q-term';
import { QueryConsole } from './modules/query-console';
import path = require('path');



export async function activate(context: ExtensionContext): Promise<void> {

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
    const qHistory = HistoryTreeItem.createHistoryTree();
    window.registerTreeDataProvider('q-servers', qServers);
    await qServers.refresh();
    window.registerTreeDataProvider('q-explorer', qRoot);
    window.registerTreeDataProvider('q-history', qHistory);
    await qHistory.refresh();
    QueryConsole.createOrShow();
    QueryView.setExtensionPath(context.extensionPath);
    QueryGrid.setExtensionPath(context.extensionPath);
    AddServer.setExtensionPath(context.extensionPath);
    // --> init


    // <-- configuration
    const queryMode = workspace.getConfiguration().get('q-client.queryMode');
    QConnManager.setQueryMode(queryMode as string);
    // -->

    commands.registerCommand(
        'q-client.refreshEntry', () => qServers.refresh());

    commands.registerCommand(
        'q-explorer.toggleAutoRefresh', () => {
            QConnManager.autoRefreshExplorer = !QConnManager.autoRefreshExplorer;
            window.showInformationMessage(`Auto Refresh Explorer ${QConnManager.autoRefreshExplorer ? 'On' : 'Off'}`);
        });

    // q cfg input
    commands.registerCommand(
        'q-client.addEntry',
        () => {
            AddServer.createOrShow();
        });

    commands.registerCommand(
        'q-client.editEntry',
        async (qConn: QConn) => {
            await AddServer.createOrShow();
            AddServer.update(qConn);
        });

    commands.registerCommand(
        'q-client.deleteEntry',
        (qConn: QConn) => {
            window.showInputBox(
                { prompt: `Confirm to Remove Server '${qConn.uniqLabel.replace(',', '-')}' (Y/n)` }
            ).then(value => {
                if (value === 'Y') {
                    QConnManager.current?.removeCfg(qConn.uniqLabel);

                }
            });
        });

    commands.registerCommand(
        'q-client.reactions',
        async () => {
            const option = await window.showQuickPick(
                ['1 - Raising an Issue', '2 - Writing a Review', '3 - Creating a Pull Request', '4 - Buying Me a Beer', '5 - Q & A'],
                { placeHolder: 'Contribute to vscode-q by' });
            switch (option?.[0]) {
                case '1':
                    env.openExternal(Uri.parse('https://github.com/jshinonome/vscode-q/issues'));
                    break;
                case '2':
                    env.openExternal(Uri.parse('https://marketplace.visualstudio.com/items?itemName=jshinonome.vscode-q&ssr=false#review-details'));
                    break;
                case '3':
                    env.openExternal(Uri.parse('https://github.com/jshinonome/vscode-q/blob/master/CONTRIBUTING.md'));
                    break;
                case '4':
                    env.openExternal(Uri.parse('https://www.buymeacoffee.com/jshinonome'));
                    break;
                case '5':
                    env.openExternal(Uri.parse('https://github.com/jshinonome/vscode-q/discussions'));
            }
        });

    commands.registerCommand(
        'q-client.connectEntry',
        async () => {
            const connManager = QConnManager.current;
            if (connManager) {
                const quickPickItems: QuickPickItem[] = connManager.qCfg.map(qcfg => {
                    return {
                        label: qcfg.uniqLabel,
                        description: `\`:${qcfg.host}:${qcfg.port}`
                    };
                });
                const recentlyUsedItems: QuickPickItem[] = Array.from(connManager.qConnPool.values())
                    .filter(qConn => !(qConn.conn == undefined))
                    .map(qConn => {
                        return {
                            label: qConn.uniqLabel,
                            description: 'connected'
                        };
                    });
                const item = await window.showQuickPick(
                    recentlyUsedItems.concat(quickPickItems),
                    { placeHolder: 'Connect to a q process' });
                if (item) {
                    commands.executeCommand('q-client.connect', item.label);
                    return item.label;
                }
            }
        });

    commands.registerCommand(
        'q-client.connect',
        uniqLabel => {
            QConnManager.current?.connect(uniqLabel);
        });

    commands.registerCommand(
        'q-client.tagEntry',
        async (qConn: QConn) => {
            qConn.tags = await window.showInputBox({
                prompt: `Tags for '${qConn.label}' separate by ',' (e.g. 'dev,quant,tca')`
            }) ?? '';
            QConnManager.current?.addCfg(qConn);
        });

    commands.registerCommand(
        'q-client.switchMode',
        async () => {
            const mode = await window.showQuickPick(['Console', 'Grid', 'Visualization'],
                { placeHolder: 'Please choose a query mode from the list below' });
            if (mode) {
                window.showInformationMessage(`Switch to Query ${mode} Mode`);
                QConnManager.setQueryMode(mode);
                QStatusBarManager.updateQueryModeStatus();
            }
        });

    commands.registerCommand(
        'q-client.toggleLimitQuery',
        () => {
            QConnManager.current?.toggleLimitQuery();
        });

    commands.registerCommand(
        'q-client.abortQuery',
        () => {
            QConnManager.current?.abortQuery();
        });

    commands.registerCommand(
        'q-client.exportServers',
        () => {
            QConnManager.current?.exportCfg();
        });

    commands.registerCommand(
        'q-client.importServers',
        () => {
            QConnManager.current?.importCfg();
        });


    commands.registerCommand(
        'q-explorer.refreshEntry', async () => await qRoot.refresh());

    const previewQueryLimit = workspace.getConfiguration().get('q-client.expl.prevQueryLimit');

    commands.registerCommand('q-explorer.preview', async (item: TreeItem) => {
        switch (item.contextValue) {
            case 'qtable':
                QConnManager.current?.sync(`{[t;l]$[t in .Q.pt;select from t where date=last date, i<l;select from t where i<l]}[\`${item.label};${previewQueryLimit}]`);
                break;
            case 'qfunction':
                QueryConsole.current?.append((item as QFunctionTreeItem).getBody(), 0, 'cached');
                break;
            default:
                if (item.label)
                    QConnManager.current?.sync(item.label as string);
        }
    });

    commands.registerCommand('q-explorer.click', label => {
        console.log(label);
    });

    context.subscriptions.push(
        commands.registerCommand('q-history.rerun', (history) => {
            if (QConnManager.current?.activeConn?.uniqLabel === history.uniqLabel)
                QConnManager.current?.sync(history.query);
            else
                QConnManager.current?.connect(history.uniqLabel, history.query);
        })
    );

    enum QueryCodeType {
        Line,
        Selection,
        Block
    }

    enum QueryTarget {
        Process,
        Terminal
    }

    async function queryCode(code: QueryCodeType, target: QueryTarget): Promise<void> {
        const editor = window.activeTextEditor;
        if (editor) {
            let n = 0;
            let query = '';
            const params = {
                textDocument: {
                    uri: editor.document.uri.toString(),
                },
                position: editor.selection.active,
            };
            switch (code) {
                case QueryCodeType.Line:
                    n = editor.selection.active.line;
                    query = editor.document.lineAt(n).text;
                    n = 0;
                    break;
                case QueryCodeType.Selection:
                    query = editor?.document.getText(
                        new Range(editor.selection.start, editor.selection.end)
                    );
                    break;
                case QueryCodeType.Block:
                    ({ query, n } = await client.sendRequest('$/on-query-block', params));
                    break;
            }
            if (query) {
                if (code === QueryCodeType.Line && query.startsWith('/<=>')) {
                    const uniqLabel = query.substring(4).trim();
                    commands.executeCommand('q-client.connect', uniqLabel);
                } else {
                    switch (target) {
                        case QueryTarget.Process:
                            QConnManager.current?.sync(query);
                            break;
                        case QueryTarget.Terminal:
                            sendToCurrentTerm(query.replace(/(\r\n|\n|\r)/gm, ''));
                            break;
                    }
                }
            }
            if (n > 0) {
                let line = editor.document.lineAt(n).text;
                while (n < editor.document.lineCount && (line === '' || line.startsWith('/'))) {
                    n++;
                    line = editor.document.lineAt(n).text;
                }
                const range = editor.document.lineAt(n).range;
                editor.selection = new Selection(range.start, range.start);
                editor.revealRange(new Range(range.start, range.start));
            }
        }
    }

    context.subscriptions.push(
        commands.registerCommand('q-client.queryCurrentLine', async () => {
            queryCode(QueryCodeType.Line, QueryTarget.Process);
        })
    );

    context.subscriptions.push(
        commands.registerCommand('q-client.querySelection', () => {
            queryCode(QueryCodeType.Selection, QueryTarget.Process);
        })
    );

    context.subscriptions.push(
        commands.registerCommand('q-client.queryBlock', () => {
            queryCode(QueryCodeType.Block, QueryTarget.Process);
        })
    );

    context.subscriptions.push(
        commands.registerCommand('q-term.sendCurrentLine', () => {
            queryCode(QueryCodeType.Line, QueryTarget.Terminal);
        })
    );

    context.subscriptions.push(
        commands.registerCommand('q-term.sendSelection', () => {
            queryCode(QueryCodeType.Selection, QueryTarget.Terminal);
        })
    );

    context.subscriptions.push(
        commands.registerCommand('q-term.sendBlock', () => {
            queryCode(QueryCodeType.Block, QueryTarget.Terminal);
        })
    );

    context.subscriptions.push(
        commands.registerCommand('q-client.terminal.run', () => {
            const filepath = window.activeTextEditor?.document.fileName;
            if (filepath)
                runQFile(filepath);
        })
    );

    context.subscriptions.push(
        commands.registerCommand('q-client.insertActiveConnLabel', () => {
            const editor = window.activeTextEditor;
            if (editor) {
                editor.edit(editBuilder => {
                    if (QConnManager.current?.activeConn?.uniqLabel) {
                        editBuilder.insert(editor.selection.active, '/<=>' + QConnManager.current?.activeConn?.uniqLabel);
                    }
                });
            }
        })
    );

    if (window.registerWebviewPanelSerializer) {
        // Make sure we register a serializer in activation event
        window.registerWebviewPanelSerializer(QueryView.viewType, {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async deserializeWebviewPanel(webviewPanel: WebviewPanel) {
                await QueryView.revive(webviewPanel, context.extensionPath);
            }
        });
    }

    workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('q-client') && !e.affectsConfiguration('q-client.term')) {
            window.showInformationMessage('Reload/Restart vscode to Making the Configuration Take Effect.');
        } else if (e.affectsConfiguration('q-server')) {
            const cfg = workspace.getConfiguration('q-server.sourceFiles');
            client.sendNotification('$/analyze-source-code', { globsPattern: cfg.get('globsPattern'), ignorePattern: cfg.get('ignorePattern') });
        }
    });

    // q language server
    const qls = path.join(context.extensionPath, 'dist', 'server.js');

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
        commands.registerCommand('q-client.sendServerCache', code => {
            client.sendNotification('$/analyze-server-cache', code);
        })
    );

    context.subscriptions.push(
        commands.registerCommand('q-client.sendOnHover', hoverItems => {
            client.sendNotification('$/prepare-on-hover', hoverItems);
        })
    );

    client.onReady().then(() => {
        const cfg = workspace.getConfiguration('q-server.sourceFiles');
        client.sendNotification('$/analyze-source-code', { globsPattern: cfg.get('globsPattern'), ignorePattern: cfg.get('ignorePattern') });
    });
}

export function deactivate(): void {
    QueryView.currentPanel?.dispose();
    QueryGrid.currentPanel?.dispose();
}
