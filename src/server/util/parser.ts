/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import * as Parser from 'web-tree-sitter';
import path = require('path')

export async function initializeParser(): Promise<Parser> {
    await Parser.init();
    const parser = new Parser();

    const lang = await Parser.Language.load(path.join(__filename, '../../assets/tree-sitter-q.wasm'));

    parser.setLanguage(lang);
    return parser;
}
