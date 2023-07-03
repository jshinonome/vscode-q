import csvParser from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { CompletionItem, CompletionItemKind } from 'vscode-languageserver/node';

export function getBuildInFsRef(): CompletionItem[] {
    const buildInFs: CompletionItem[] = [];
    const csvPath = path.join(__filename, '../../assets/csv/build-in-fs.csv');
    fs.createReadStream(csvPath)
        .pipe(csvParser())
        .on('data', (data: CompletionItem) => {
            data.kind = Number(data.kind) as CompletionItemKind;
            buildInFs.push(data);
        })
        .on('end', () => {
            console.log('Loaded build-in functions');
        });
    return buildInFs;
}

const sigPath = path.join(__filename, '../../assets/source/build-in-fs-sigs.q');

export const buildInFs = getBuildInFsRef();
export const buildInFsSigs = fs.readFileSync(sigPath, 'utf8');
