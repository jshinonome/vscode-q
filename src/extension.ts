import { window, ExtensionContext, languages, IndentAction, commands, WebviewPanel, Range, StatusBarItem, StatusBarAlignment } from 'vscode';
import { QServerTreeProvider } from './q-server-tree';
import { QConn } from './q-conn';
import { QueryView } from './query-view';
import { qCfgInput } from './q-cfg-input';

let connStatusBar: StatusBarItem;

export function activate(context: ExtensionContext): void {

    console.log('q ext for vscode is on');
    // extra language configurations
    languages.setLanguageConfiguration('q', {
        onEnterRules: [
            {
                // eslint-disable-next-line no-useless-escape
                beforeText: /^[\(\[{]/,
                action: { indentAction: IndentAction.None, appendText: '\n ' }
            }
        ]
    });

    // status bar
    connStatusBar = window.createStatusBarItem(StatusBarAlignment.Left, 100);
    context.subscriptions.push(connStatusBar);
    connStatusBar.text = '$(circle-slash) Disconnected';
    connStatusBar.color = '#6272A4';
    connStatusBar.show();
    commands.registerCommand(
        'qservers.updateStatusBar',
        name => updateConnStatus(name)
    );

    // q-server-explorer
    const qServers = new QServerTreeProvider();
    window.registerTreeDataProvider('qservers', qServers);

    commands.registerCommand(
        'qservers.refreshEntry', () => qServers.refresh());

    // q cfg input
    commands.registerCommand(
        'qservers.addEntry',
        async () => {
            const qcfg = await qCfgInput(undefined);
            qServers.qConnManager.addCfg(qcfg);
        });

    commands.registerCommand(
        'qservers.editEntry',
        async (qConn: QConn) => {
            const qcfg = await qCfgInput(qConn, false);
            qServers.qConnManager.addCfg(qcfg);

        });

    commands.registerCommand(
        'qservers.deleteEntry',
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
        'qservers.connect',
        label => {
            qServers.qConnManager.connect(label);
        });

    context.subscriptions.push(
        commands.registerCommand('queryview.start', () => {
            QueryView.createOrShow(context.extensionPath);
        })
    );

    context.subscriptions.push(
        commands.registerCommand('qservers.queryCurrentLine', () => {
            const n = window.activeTextEditor?.selection.active.line;
            if (QueryView.currentPanel === undefined) {
                QueryView.createOrShow(context.extensionPath);
            }
            if (n !== undefined) {
                const query = window.activeTextEditor?.document.lineAt(n).text;
                console.log(query);
                if (query) {
                    qServers.qConnManager.sync(query);
                }
            }
        })
    );

    context.subscriptions.push(
        commands.registerCommand('qservers.querySelection', () => {
            if (QueryView.currentPanel === undefined) {
                QueryView.createOrShow(context.extensionPath);
            }
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
            async deserializeWebviewPanel(webviewPanel: WebviewPanel, state: any) {
                console.log(`Got state: ${state}`);
                QueryView.revive(webviewPanel, context.extensionPath);
            }
        });
    }

}

function updateConnStatus(name: string) {
    connStatusBar.text = `$(pulse) ${name.toUpperCase()}`;
    connStatusBar.color = '#8BE9FD';
}

export function deactivate(): void {
    window.showInformationMessage('Decativate vscode-q');
}
