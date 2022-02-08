/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { CompletionItem, CompletionItemKind } from 'vscode-languageserver/node';
import * as fs from 'fs';
import csvParser = require('csv-parser');
import path = require('path');

const buildInFs: CompletionItem[] = [];
let buildInFsSigs = '';

export async function getBuildInFs(): Promise<CompletionItem[]> {
    if (buildInFs.length !== 0)
        return buildInFs;
    const csvPath = path.join(__filename, '../../assets/csv/build-in-fs.csv');
    return new Promise<CompletionItem[]>((resolve, reject) => {
        fs.createReadStream(csvPath)
            .pipe(csvParser())
            .on('data', (data: CompletionItem) => {
                data.kind = Number(data.kind) as CompletionItemKind;
                buildInFs.push(data);
            })
            .on('end', () => {
                console.log('Loaded build-in functions');
                resolve(buildInFs);
            })
            .on('error', (err) => {
                console.error(`build-in load error ${err}`);
                reject(err);
            });
    });
}

export async function getBuildInFsSigs(): Promise<string> {
    if (buildInFsSigs.length === 0) {
        const sigPath = path.join(__filename, '../../assets/source/build-in-fs-sigs.q');
        buildInFsSigs = await fs.promises.readFile(sigPath, 'utf8');
    }
    return buildInFsSigs;
}
