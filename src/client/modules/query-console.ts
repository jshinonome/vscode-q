/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { Disposable, OutputChannel, window, workspace } from 'vscode';
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
    private autoClear = workspace.getConfiguration().get('q-client.output.autoClear') as boolean;
    private includeQuery = workspace.getConfiguration().get('q-client.output.includeQuery') as boolean;

    public static createOrGet(): QueryConsole {
        if (!QueryConsole.current) {
            const _console = window.createOutputChannel('q Console');
            QueryConsole.current = new QueryConsole(_console);
        }
        return QueryConsole.current;
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

    public append(output: string | string[], time = 0, uniqLabel: string, query = ''): void {
        this._console.show(true);
        if (this.autoClear) {
            this._console.clear();
        }
        const label = uniqLabel.replace(',', '-');
        const date = new Date();
        this._console.appendLine(`>>> ${label} @ ${date.toLocaleTimeString()} ---- ${time}(ms) elapsed <<<`);
        this.appendQuery(query);
        if (Array.isArray(output)) {
            output.forEach(o => this._console.appendLine(o));
        } else {
            this._console.appendLine(output);
        }
        this._console.appendLine('<<<\n');
    }

    public appendError(msg: string[], time = 0, uniqLabel: string, query = ''): void {
        this._console.show(true);
        if (this.autoClear) {
            this._console.clear();
        }
        const label = uniqLabel.replace(',', '-');
        const date = new Date();
        this._console.appendLine(`>>> ${label} @ ${date.toLocaleTimeString()} ---- ${time}(ms) elapsed`);
        this.appendQuery(query);
        this._console.appendLine(`>>> ${msg[0]}: ${msg[1]}`);
        const explanation = this.errorMsgMap.get(msg[1]);
        if (explanation) {
            this._console.appendLine(`>>> Explanation: ${explanation}`);
        } else if (/^(\.[a-zA-Z][a-zA-Z\d_]*(?:\.[a-zA-Z\d_]+)*|[a-zA-z][a-zA-Z\d]*)$/gm.test(msg[1])) {
            this._console.appendLine(`>>> Explanation: Value error (${msg[1]} undefined)`);
        }
        msg.shift();
        msg.shift();
        msg.pop();
        if (msg.length > 0) {
            this._console.appendLine('>>>');
            msg.forEach(o => this._console.appendLine(o));
        }
        this._console.appendLine('<<<\n');
    }

    public appendQuery(query: string): void {
        if (query.length > 0 && this.includeQuery) {
            this._console.appendLine('<<< query  >>>');
            this._console.appendLine(query);
            this._console.appendLine('');
            this._console.appendLine('<<< result >>>');
        }

    }
}