import { ExtensionContext, languages, IndentAction } from 'vscode';

export function activate(context: ExtensionContext) {
    languages.setLanguageConfiguration("q", {
        onEnterRules: [
            {
                beforeText: /^[\(\[\{]/,
                action: { indentAction: IndentAction.None, appendText: '\n ' }
            }
        ]
    });
};

export function deactivate() { }
