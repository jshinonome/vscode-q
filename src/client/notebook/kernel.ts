import { NotebookCell, NotebookCellExecution, NotebookCellOutput, NotebookCellOutputItem, NotebookController, NotebookDocument, notebooks } from 'vscode';
import { QConnManager } from '../modules/q-conn-manager';

export class QNotebookKernel {
    readonly id: string = 'q-notebook-kernel';
    readonly notebookType: string = 'q-notebook';
    readonly label: string = 'q Notebook';
    readonly supportedLanguages = ['q'];

    private readonly _controller: NotebookController;
    private readonly _qConnManager = QConnManager.create();
    private _executionOrder = 0;
    private currentExecution: NotebookCellExecution | null = null;

    constructor() {
        this._controller = notebooks.createNotebookController(
            this.id,
            this.notebookType,
            this.label
        );
        this._controller.supportedLanguages = this.supportedLanguages;
        this._controller.supportsExecutionOrder = true;
        this._controller.executeHandler = this._executeAll.bind(this);
        this._controller.interruptHandler = this._interrupt.bind(this);
    }

    dispose(): void {
        this._controller.dispose();
    }

    private _executeAll(cells: NotebookCell[], _notebook: NotebookDocument, _controller: NotebookController): void {
        for (const cell of cells) {
            this._doExecution(cell);
        }
    }

    private _interrupt(_notebook: NotebookDocument) {
        this.currentExecution?.end(false, Date.now());
    }

    private async _doExecution(cell: NotebookCell): Promise<void> {
        const execution = this._controller.createNotebookCellExecution(cell);
        execution.executionOrder = ++this._executionOrder;
        this.currentExecution = execution;
        execution.start(Date.now());

        try {
            this._qConnManager.sync(cell.document.getText(), result => {
                execution.clearOutput();
                switch (result.type) {
                    case 'text':
                    case 'error':
                    case 'json':
                        execution.replaceOutput([
                            new NotebookCellOutput([
                                NotebookCellOutputItem.json(result, 'x-application/q-notebook'),
                                NotebookCellOutputItem.json(result, 'text/x-json')
                            ])
                        ]);
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
