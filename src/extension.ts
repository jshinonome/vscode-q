import { window, ExtensionContext, languages, IndentAction, DebugConsoleMode, commands } from 'vscode';
import { QConnManager } from "./q-conn-manager";
export function activate(context: ExtensionContext) {

    console.log("q ext for vscode is on");
    // extra language configurations
    languages.setLanguageConfiguration("q", {
        onEnterRules: [
            {
                beforeText: /^[\(\[\{]/,
                action: { indentAction: IndentAction.None, appendText: '\n ' }
            }
        ]
    });
    const qConnManager = new QConnManager()

    const disposable = commands.registerCommand('qext.connect', () => {
        qConnManager.connect('local')
    });

    const disposable2 = commands.registerCommand('qext.query', () => {
        qConnManager.getConn("local")?.k("dict", function (err, res) {
            if (err) throw err;
            console.log('resutl: ', res);
        })
    });

    context.subscriptions.push(disposable);
};

export function deactivate() { }
