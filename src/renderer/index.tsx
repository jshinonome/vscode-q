// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, render } from 'preact';
import type { ActivationFunction } from 'vscode-notebook-renderer';
import { QNotebookCell } from './render';

export const activate: ActivationFunction = _context => {
    return {
        renderOutputItem(outputItem, element) {
            try {
                render(<QNotebookCell queryResult={outputItem.json()}/>, element);
            } catch {
                render(<p>Error!</p>, element);
            }
        },
    // disposeOutputItem(outputId) { }
    };
};
