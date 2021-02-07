/**
 * Copyright (c) 2021 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import {
    CallHierarchyIncomingCall, CallHierarchyIncomingCallsParams, CallHierarchyItem, CallHierarchyOutgoingCall, CallHierarchyOutgoingCallsParams, CallHierarchyPrepareParams, SymbolKind
} from 'vscode-languageserver';
import Analyzer from './analyser';

export default class CallHierarchyProvider {

    private analyzer: Analyzer;
    constructor(analyzer: Analyzer) {
        this.analyzer = analyzer;
    }

    onPrepare(params: CallHierarchyPrepareParams): CallHierarchyItem[] {
        const word = this.analyzer.wordAtPoint(params.textDocument.uri, params.position.line, params.position.character);
        if (word) {
            const symInfos = this.analyzer.getSymbolsByUri(params.textDocument.uri).filter(symInfo => symInfo.name === word.text);
            if (symInfos.length > 0 && symInfos[0].kind === SymbolKind.Function) {
                // the first item should be itself
                return [
                    {
                        kind: SymbolKind.Function,
                        name: word.text,
                        range: word.range,
                        selectionRange: word.range,
                        uri: params.textDocument.uri,
                        data: word.text,
                    }
                ];
            }
        }
        return [];
    }
    onIncomingCalls(params: CallHierarchyIncomingCallsParams): CallHierarchyIncomingCall[] {
        const containerName = params.item.name as string;
        if (!containerName)
            return [];
        // search for functions call this function
        const items = this.analyzer.getCallHierarchyItemByWord(containerName);
        return items.map(item => ({ from: item, fromRanges: [item.range] }));
    }
    onOutgoingCalls(params: CallHierarchyOutgoingCallsParams): CallHierarchyOutgoingCall[] {
        // search what this function calls
        const globalId = this.analyzer.getGlobalIdByUriContainerName(params.item.uri, params.item.data as string);
        return globalId.map(id => this.analyzer.getCallHierarchyItemByWord(id)).flat(1)
            .map(item => ({ to: item, fromRanges: [item.range] }));
    }

}