import fs from 'fs';
import { NotebookDocument, Uri, window, workspace } from 'vscode';

async function exportAsQFile(notebook: NotebookDocument | undefined): Promise<void> {
    if (notebook) {
        if (!workspace.workspaceFolders) {
            window.showErrorMessage('No opened workspace folder');
            return;
        }
        const filePath = notebook.uri.toString().slice(0, -2);
        const fileUri = await window.showSaveDialog({
            defaultUri: Uri.parse(filePath).with({ scheme: 'file' })
        });
        if (fileUri) {
            fs.writeFile(
                fileUri.fsPath,
                notebook.getCells()
                    .filter(cell => cell.document.languageId === 'q')
                    .map(cell => {
                        const line = cell.document.getText().trimEnd();
                        return line.endsWith(';') ? line : line + ';';
                    }).join('\n\n'),
                err => window.showErrorMessage(err?.message ?? ''));
        }
        console.log(notebook.getCells().map(cell => cell.document.getText()));
    }
}


export { exportAsQFile };
