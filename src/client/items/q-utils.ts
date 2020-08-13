/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { TreeItem } from 'vscode';

export function setCommand(item: TreeItem): void {
    item.command = {
        command: 'q-explorer.click',
        title: 'click',
        arguments: [item.label]
    };
}