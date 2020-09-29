/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { CancellationToken, languages, Position, SemanticTokens, SemanticTokensBuilder, SemanticTokensLegend, TextDocument } from 'vscode';

const tokenTypes = new Map<string, number>();
const tokenModifiers = new Map<string, number>();

const legend = (function () {
    const tokenTypesLegend = ['variable', 'parameter', 'type', 'class'];
    tokenTypesLegend.forEach((tokenType, index) => tokenTypes.set(tokenType, index));

    const tokenModifiersLegend: string[] = [];
    tokenModifiersLegend.forEach((tokenModifier, index) => tokenModifiers.set(tokenModifier, index));

    return new SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
})();

interface IParsedToken {
    line: number;
    startCharacter: number;
    length: number;
    tokenType: string;
    tokenModifiers: string[];
}

class DocumentSemanticTokensProvider implements DocumentSemanticTokensProvider {
    async provideDocumentSemanticTokens(document: TextDocument, _token: CancellationToken): Promise<SemanticTokens> {
        const allTokens = this._parseText(document.getText());
        const builder = new SemanticTokensBuilder();
        allTokens.forEach((token) => {
            builder.push(token.line, token.startCharacter, token.length, this._encodeTokenType(token.tokenType), this._encodeTokenModifiers(token.tokenModifiers));
        });
        return builder.build();
    }

    private _encodeTokenType(tokenType: string): number {
        if (tokenTypes.has(tokenType)) {
            return tokenTypes.get(tokenType) ?? 0;
        } else if (tokenType === 'notInLegend') {
            return tokenTypes.size + 2;
        }
        return 0;
    }

    private _encodeTokenModifiers(strTokenModifiers: string[]): number {
        let result = 0;
        for (let i = 0; i < strTokenModifiers.length; i++) {
            const tokenModifier = strTokenModifiers[i];
            if (tokenModifiers.has(tokenModifier)) {
                result = result | (1 << (tokenModifiers.get(tokenModifier) ?? 0));
            } else if (tokenModifier === 'notInLegend') {
                result = result | (1 << tokenModifiers.size + 2);
            }
        }
        return result;
    }

    private _parseText(text: string): IParsedToken[] {
        const ipt: IParsedToken[] = [];
        const lines = text.split(/\r\n|\r|\n/);
        let offset = 0;
        for (let i = 0; i < lines.length; i++) {
            i = this.skipComment(i, lines);
            if (i >= lines.length) {
                break;
            }
            const line = lines[i];
            const openOffset = line.indexOf('{', offset);
            if (openOffset === -1) {
                offset = 0;
            } else {
                const pos = this._parseParameter(new Position(i, openOffset + 1), lines, ipt);
                // search current in next loop, set -1 to cancel i++
                i = pos.line - 1;
                offset = pos.character;
            }
        }
        return ipt;
    }

    // start from next char of '{'
    private _parseParameter(p: Position, lines: string[], ipt: IParsedToken[]): Position {
        if (lines[p.line][p.character] === '}') {
            return new Position(p.line, p.character + 1);
        }
        let params: string[] = [];
        let startPos = p;

        if (lines[p.line].charAt(p.character) === '[') {
            const closeOffset = lines[p.line].indexOf(']', p.character);
            if (closeOffset > p.character) {
                params = lines[p.line].substring(p.character + 1, closeOffset).replace(/ /g, '').split(';');
                startPos = new Position(p.line, closeOffset + 1);
            }
        }

        let offset = startPos.character;
        // if params undefine, continue to find '}', else set token to the word
        for (let i = startPos.line; i < lines.length; i++) {
            const line = lines[i];
            const openOffset = line.indexOf('{', offset);
            const closeOffset = line.indexOf('}', offset);

            if (openOffset > offset) {
                // case: *** } *** {
                if (closeOffset > offset && closeOffset < openOffset) {
                    this._matchParamters(i, offset, closeOffset - 1, line, ipt, params);
                    return new Position(i, closeOffset + 1);
                } else if (closeOffset > openOffset || closeOffset === -1) {
                    // case: *** { *** } | *** { ***
                    this._matchParamters(i, offset, openOffset - 1, line, ipt, params);
                    const pos = this._parseParameter(new Position(i, openOffset + 1), lines, ipt);
                    // search current in next loop, set -1 to cancel i++
                    i = pos.line - 1;
                    offset = pos.character;
                }
            } else if (closeOffset > offset) {
                // case: *** } ***
                this._matchParamters(i, offset, closeOffset - 1, line, ipt, params);
                return new Position(i, closeOffset + 1);
            } else {
                // case : ***
                this._matchParamters(i, offset, line.length, line, ipt, params);
                offset = 0;
            }
        }
        return new Position(lines.length - 1, (lines.slice(-1).pop()?.length ?? 0));

    }

    private _matchParamters(i: number, start: number, end: number, line: string, ipt: IParsedToken[], params: string[]) {
        params.forEach(p => {
            if (p === '' || line.indexOf('/') == 0) {
                return;
            }
            const regex = new RegExp('\\b(?<![`._])' + p + '\\b', 'g');
            const commentStart = line.indexOf(' /', start);
            if (commentStart == 0) {
                return;
            }
            end = commentStart > 0 ? commentStart : end;
            let match;
            while ((match = regex.exec(line)) != null) {
                if (match.index >= start && match.index <= end) {
                    ipt.push({
                        line: i,
                        startCharacter: match.index,
                        length: p.length,
                        tokenType: 'parameter',
                        tokenModifiers: []
                    });
                }
            }
        });
    }

    private skipComment(i: number, lines: string[]): number {
        if (/\/\s*$/g.test(lines[i])) {
            // match '/'
            i = i + 1;
            while (!/\/\s*$/g.test(lines[i]) && i < lines.length) {
                i = i + 1;
            }
            return i = i + 1;
        } else if (/$\\\s*/g.test(lines[i])) {
            // match '\'
            return lines.length;
        } else if (lines[i][0] === '/' && !/\/\s*$/g.test(lines[i])) {
            return i = i + 1;
        } else {
            return i;
        }
    }

}

export const semanticTokensProvider = languages.registerDocumentSemanticTokensProvider({ language: 'q' },
    new DocumentSemanticTokensProvider(),
    legend
);