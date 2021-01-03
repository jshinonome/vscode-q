import path = require('path');
import { window, workspace } from 'vscode';

export function sendToCurrentTerm(text: string): void {
    if (window.activeTerminal)
        window.activeTerminal.sendText(text);
    else
        window.showWarningMessage('No Active Terminal Detected');
}


export function runQFile(filepath: string): void {
    const file = path.parse(filepath).base;
    const title = `q - ${file}`;
    // close existing terminal and create a new one
    window.terminals.forEach(term => {
        if (term.name === title)
            term.dispose();
    });
    const term = window.createTerminal(`q - ${file}`);
    term.show();
    const qBinary = workspace.getConfiguration('q-client.term').get('qBinary');
    const envPath = workspace.getConfiguration('q-client.term').get('envPath');
    let cmd = `${qBinary} ${filepath}`
    if (envPath)
        cmd = `source ${envPath} && ` + cmd;
    term.sendText(cmd);
}