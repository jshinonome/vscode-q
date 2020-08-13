/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { Range } from 'vscode-languageserver';
import { SyntaxNode } from 'web-tree-sitter';

export function forEach(node: SyntaxNode, cb: (n: SyntaxNode) => void): void {
    cb(node);
    if (node.children.length) {
        node.children.forEach(n => forEach(n, cb));
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
