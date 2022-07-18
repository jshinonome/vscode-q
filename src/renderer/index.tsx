// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, render } from 'preact';
import type { ActivationFunction } from 'vscode-notebook-renderer';
import { QNotebookCell } from './render';

export const activate: ActivationFunction = _context => {
    return {
        renderOutputItem(outputItem, element) {
            try {
                render(<QNotebookCell queryResult={outputItem.json()}/>, element);
            } catch(e) {
                render(<QNotebookCell queryResult={
                    {
                        data:['ERROR', 'Failed to render this message'+(e as Error).toString()],
                        duration:0,
                        type:'error',
                        uniqLabel:''
                    }
                }></QNotebookCell>, element);
            }
        },
    // disposeOutputItem(outputId) { }
    };
};
