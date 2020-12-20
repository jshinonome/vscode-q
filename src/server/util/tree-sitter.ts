/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { Range, uinteger } from 'vscode-languageserver/node';
import { SyntaxNode } from 'web-tree-sitter';

export function forEach(node: SyntaxNode, cb: (n: SyntaxNode) => void): void {
    cb(node);
    if (node.children.length) {
        node.children.forEach(n => forEach(n, cb));
    }
}

export function forEachAndSkip(node: SyntaxNode, skipNodeType: string, cb: (n: SyntaxNode) => void): void {
    cb(node);
    if (node.children.length) {
        node.children.forEach(n => {
            if (n.type === skipNodeType)
                return;
            else
                forEachAndSkip(n, skipNodeType, cb);
        });
    }
}

export function range(n: SyntaxNode): Range {
    return Range.create(
        n.startPosition.row,
        n.startPosition.column,
        n.endPosition.row,
        n.endPosition.column,
    );
}

export function token(n: SyntaxNode): uinteger[] {
    return [
        n.startPosition.row,
        n.startPosition.column,
        n.endPosition.column - n.startPosition.column
    ];
}

export function isDefinition(n: SyntaxNode): boolean {
    switch (n.type) {
        case 'assignment':
            return true;
        default:
            return false;
    }
}

export function isReference(n: SyntaxNode): boolean {
    switch (n.type) {
        case 'local_identifier':
        case 'global_identifier':
            return true;
        default:
            return false;
    }
}

export function isSeparator(n: SyntaxNode): boolean {
    return n.type === 'separator';
}

export function isSymbol(n: SyntaxNode): boolean {
    return n.type === 'constant_symbol';
}

export function isNamespace(n: SyntaxNode): boolean {
    return n.type === 'namespace';
}

export function isNamespaceEnd(n: SyntaxNode): boolean {
    return n.type === 'namespace_end';
}

export function isFunctionBody(n: SyntaxNode): boolean {
    return n.type === 'function_body';
}

// extract params from a function
export function extractParams(n: SyntaxNode): string[] {
    if (n.firstNamedChild && n.firstNamedChild.type === 'formal_parameters') {
        const paramNodes = n.firstNamedChild.namedChildren;
        const params = paramNodes.map(n => n.text);
        return params;
    }
    return [];
}

export function findParent(
    start: SyntaxNode,
    predicate: (n: SyntaxNode) => boolean,
): SyntaxNode | null {
    let node = start.parent;
    while (node !== null) {
        if (predicate(node)) {
            return node;
        }
        node = node.parent;
    }
    return null;
}

export function findParentNotInTypes(
    start: SyntaxNode,
    types: string[],
    predicate: (n: SyntaxNode) => boolean,
): SyntaxNode | null {
    let node = start.parent;
    while (node !== null) {
        if (predicate(node)) {
            return node;
        } else if (types.indexOf(node.type) >= 0) {
            return null;
        }
        node = node.parent;
    }
    return null;
}
