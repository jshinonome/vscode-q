/**
 * Copyright (c) 2022 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { NotebookCell, NotebookCellOutput, NotebookCellOutputItem, NotebookController, NotebookDocument, notebooks } from 'vscode';
import { QConnManager } from '../client/modules/q-conn-manager';

export class QNotebookKernel {
    readonly id: string = 'q-notebook-kernel';
    readonly notebookType: string = 'q-notebook';
    readonly label: string = 'q Notebook';
    readonly supportedLanguages = ['q'];

    private readonly _controller: NotebookController;
    private readonly _qConnManager = QConnManager.create();
    private _executionOrder = 0;

    constructor() {
        this._controller = notebooks.createNotebookController(
            this.id,
            this.notebookType,
            this.label
        );
        this._controller.supportedLanguages = this.supportedLanguages;
        this._controller.supportsExecutionOrder = true;
        this._controller.executeHandler = this._executeAll.bind(this);
    }

    dispose(): void {
        this._controller.dispose();
    }

    private _executeAll(cells: NotebookCell[], _notebook: NotebookDocument, _controller: NotebookController): void {
        for (const cell of cells) {
            this._doExecution(cell);
        }
    }

    private async _doExecution(cell: NotebookCell): Promise<void> {
        const execution = this._controller.createNotebookCellExecution(cell);
        execution.executionOrder = ++this._executionOrder;
        execution.start(Date.now());


        try {
            this._qConnManager.sync(cell.document.getText(), result => {
                switch (result.type) {
                    case 'text':
                    case 'error':
                    case 'json':
                        execution.replaceOutput([new NotebookCellOutput([
                            NotebookCellOutputItem.json(
                                result, 'x-application/q-notebook'
                            )])]);
                        break;
                    case 'bytes':
                        execution.replaceOutput([new NotebookCellOutput([
                            NotebookCellOutputItem.text(`<img src="data:image/png;base64,${Buffer.from(result.data).toString('base64')}"/>`, 'text/html')
                        ])]);
                        break;
                }
                execution.end(true, Date.now());
            });
        } catch (e) {
            execution.replaceOutput([
                new NotebookCellOutput([
                    NotebookCellOutputItem.error({
                        name: e instanceof Error && e.name || 'error',
                        message: e instanceof Error && e.message || JSON.stringify(e, undefined, 4)
                    })
                ])
            ]);
            execution.end(false, Date.now());
        }
    }
}
