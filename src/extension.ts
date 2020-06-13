import { window, ExtensionContext, languages, IndentAction, commands } from 'vscode';
import { QServerTreeProvider } from './q-server-tree';
import { QConn } from './q-conn';
export function activate(context: ExtensionContext) {

    console.log('q ext for vscode is on');
    // extra language configurations
    languages.setLanguageConfiguration('q', {
        onEnterRules: [
            {
                // eslint-disable-next-line no-useless-escape
                beforeText: /^[\(\[\{]/,
                action: { indentAction: IndentAction.None, appendText: '\n ' }
            }
        ]
    });

    // q-server-explorer
    const qServers = new QServerTreeProvider();
    window.registerTreeDataProvider('qservers', qServers);
    commands.registerCommand('qservers.refreshEntry', () => qServers.refresh());
    commands.registerCommand('qservers.addEntry', () => window.showInformationMessage('Successfully called add entry.'));
    commands.registerCommand('qservers.editEntry', (node: QConn) => window.showInformationMessage(`Successfully called edit entry on ${node.label}.`));
    commands.registerCommand('qservers.deleteEntry', (node: QConn) => window.showInformationMessage(`Successfully called delete entry on ${node.label}.`));

    // commands.registerCommand(
    //     'extension.openPackageOnNpm',
    //     moduleName => commands.executeCommand('vscode.open', Uri.parse(`https://www.npmjs.com/package/${moduleName}`)));



    // const qConnManager = new QConnManager()

    // const disposable = commands.registerCommand('qext.connect', () => {
    //     qConnManager.connect('local');
    // });

    // const disposable2 = commands.registerCommand('qext.query', () => {
    //     qConnManager.getConn("local")?.k("dict", function (err, res) {
    //         if (err) throw err;
    //         console.log('resutl: ', res);
    //     });
    // });

    // context.subscriptions.push(disposable);
}

export function deactivate() { }
