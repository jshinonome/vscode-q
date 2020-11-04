/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { Disposable, OutputChannel, window } from 'vscode';
import fs = require('fs');
import csvParser = require('csv-parser');
import path = require('path');

function getErrorMsgMap(): Map<string, string> {
    const errorMsgMap = new Map();
    const csvPath = path.join(__filename, '../../assets/csv/error-msgs.csv');
    fs.createReadStream(csvPath)
        .pipe(csvParser())
        .on('data', (data: { error: string, explanation: string }) => {
            errorMsgMap.set(data.error, data.explanation);
        })
        .on('end', () => {
            console.log('Loaded Error Msg Map');
        });
    return errorMsgMap;
}

export class QueryConsole {
    public static current: QueryConsole | undefined;
    public static readonly viewType = 'query-console';
    private readonly _console: OutputChannel;
    private _disposables: Disposable[] = [];
    private errorMsgMap = getErrorMsgMap();
    public static createOrShow(): void {
        if (QueryConsole.current) {
            QueryConsole.current._console.show(true);
        } else {
            const _console = window.createOutputChannel('q Console');
            _console.show(true);
            QueryConsole.current = new QueryConsole(_console);
        }
    }
    private constructor(console: OutputChannel) {
        this._console = console;
    }

    public dispose(): void {
        QueryConsole.current = undefined;
        // Clean up our assets
        this._console.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    public append(output: string | string[], time = 0, uniqLabel: string): void {
        const date = new Date();
        this._console.appendLine(`> ${uniqLabel} @ ${date.toLocaleTimeString()}`);
        this._console.appendLine('>');
        if (Array.isArray(output)) {
            output.forEach(o => this._console.appendLine(o));
        } else {
            this._console.appendLine(output);
        }
        this._console.appendLine('<');
        this._console.appendLine(`< ${time}(ms) elapsed\n`);
    }

    public appendError(msg: string[], time = 0, uniqLabel: string): void {
        const date = new Date();
        this._console.appendLine(`> ${uniqLabel} @ ${date.toLocaleTimeString()}`);
        this._console.appendLine(`> ${msg[0]}: ${msg[1]}`);
        const explanation = this.errorMsgMap.get(msg[1]) ?? `Value error (${msg[1]} undefined)`;
        this._console.appendLine(`> Explanation: ${explanation}`);
        msg.shift();
        msg.shift();
        msg.pop();
        if (msg.length > 0) {
            this._console.appendLine('>');
            msg.forEach(o => this._console.appendLine(o));
            this._console.appendLine('<');
        }
        this._console.appendLine(`< ${time}(ms) elapsed\n`);
    }

}
