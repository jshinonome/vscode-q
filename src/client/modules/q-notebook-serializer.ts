/**
 * Copyright (c) 2022 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { CancellationToken, NotebookCellData, NotebookCellKind, NotebookCellOutput, NotebookCellOutputItem, NotebookData, NotebookSerializer } from 'vscode';

interface RawNotebookCell {
    language: string;
    value: string;
    kind: NotebookCellKind;
    editable?: boolean;
    outputs: RawCellOutput[];
}

interface RawCellOutput {
    mime: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
}

export class QNotebookSerializer implements NotebookSerializer {

    async deserializeNotebook(content: Uint8Array, _token: CancellationToken): Promise<NotebookData> {
        const contents = new TextDecoder().decode(content);

        let raw: RawNotebookCell[];
        try {
            raw = <RawNotebookCell[]>JSON.parse(contents);
        } catch {
            raw = [];
        }

        function convertRawOutputToBytes(raw: RawNotebookCell) {
            const result: NotebookCellOutputItem[] = [];

            for (const output of raw.outputs) {
                switch (output.mime) {
                    case 'text/plain':
                    case 'text/html':
                        result.push(new NotebookCellOutputItem(new TextEncoder().encode(output.value), output.mime));
                        break;
                    default:
                        result.push(new NotebookCellOutputItem(new TextEncoder().encode(JSON.stringify(output.value)), output.mime));
                }
            }

            return result;
        }

        // Create array of Notebook cells for the VS Code API from file contents
        const cells = raw.map(item => new NotebookCellData(
            item.kind,
            item.value,
            item.language
        ));

        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            cell.outputs = raw[i].outputs ? [new NotebookCellOutput(convertRawOutputToBytes(raw[i]))] : [];
        }

        // Pass read and formatted Notebook Data to VS Code to display Notebook with saved cells
        return new NotebookData(
            cells
        );
    }

    async serializeNotebook(data: NotebookData, _token: CancellationToken): Promise<Uint8Array> {
        // function to take output renderer data to a format to save to the file
        function asRawOutput(cell: NotebookCellData): RawCellOutput[] {
            const result: RawCellOutput[] = [];
            for (const output of cell.outputs ?? []) {
                for (const item of output.items) {
                    let outputContents = '';
                    try {
                        outputContents = new TextDecoder().decode(item.data);
                    } catch {
                        continue;
                    }

                    try {
                        const outputData = JSON.parse(outputContents);
                        result.push({ mime: item.mime, value: outputData });
                    } catch {
                        result.push({ mime: item.mime, value: outputContents });
                    }
                }
            }
            return result;
        }

        // Map the Notebook data into the format we want to save the Notebook data as
        const contents: RawNotebookCell[] = [];

        for (const cell of data.cells) {
            contents.push({
                kind: cell.kind,
                language: cell.languageId,
                value: cell.value,
                outputs: asRawOutput(cell)
            });
        }

        // Give a string of all the data to save and VS Code will handle the rest
        return new TextEncoder().encode(JSON.stringify(contents));
    }
}


// NEEDED Declaration to silence errors
declare class TextDecoder {
    decode(data: Uint8Array): string;
}

declare class TextEncoder {
    encode(data: string): Uint8Array;
}
