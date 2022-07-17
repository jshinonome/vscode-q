import { TreeItem } from 'vscode';

export function setCommand(item: TreeItem): void {
    item.command = {
        command: 'q-explorer.click',
        title: 'click',
        arguments: [item.label]
    };
}
