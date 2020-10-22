/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { Disposable, OutputChannel, window } from 'vscode';

export class QueryConsole {
    public static current: QueryConsole | undefined;
    public static readonly viewType = 'query-console';
    private readonly _console: OutputChannel;
    private _disposables: Disposable[] = [];
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
        this._console.appendLine(`/=> ${uniqLabel} @ ${date.toLocaleTimeString()}`);
        if (Array.isArray(output)) {
            output.forEach(o => this._console.appendLine(o));
        } else {
            this._console.appendLine(output);
        }
        this._console.appendLine(`/=< ${time}(ms) elapsed\n`);
    }
}