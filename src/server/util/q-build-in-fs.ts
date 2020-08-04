/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { CompletionItem } from 'vscode-languageserver';
import fs = require('fs');
import csvParser = require('csv-parser');
import path = require('path');

export default function getBuildInFsRef(): CompletionItem[] {
    const buildInFs: CompletionItem[] = [];
    const csvPath = path.join(__filename, '../../assets/csv/build-in-fs.csv');
    fs.createReadStream(csvPath)
        .pipe(csvParser())
        .on('data', (data: CompletionItem) => {
            buildInFs.push(data);
        })
        .on('end', () => {
            console.log('Loaded build-in functions');
        });
    return buildInFs;
}
