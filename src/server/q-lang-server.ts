/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import * as fs from 'fs';
import {
    CompletionItem, Connection, Diagnostic, DiagnosticSeverity,
    DidChangeWatchedFilesParams, DocumentHighlight, DocumentSymbolParams, FileChangeType, Hover,
    IConnection, InitializeParams, Location, MarkupContent, MarkupKind, PrepareRenameParams, Range,
    ReferenceParams, RenameParams, ServerCapabilities, SignatureHelp,
    SignatureHelpParams, SymbolInformation, TextDocumentPositionParams, TextDocuments,
    TextDocumentSyncKind, TextEdit, WorkspaceEdit, WorkspaceSymbolParams
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import QAnalyzer, { word } from './modules/q-analyser';
import getBuildInFsRef from './util/q-build-in-fs';
import { initializeParser } from './util/q-parser';

export default class QLangServer {
    connection: IConnection;
    // Create a simple text document manager. The text document manager
    // supports full document sync only
    documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

    buildInFsRef: CompletionItem[] = [];

    private analyzer: QAnalyzer;

    private constructor(connection: IConnection, analyzer: QAnalyzer) {
        this.connection = connection;
        this.analyzer = analyzer;
        this.buildInFsRef = getBuildInFsRef();
        // Make the text document manager listen on the connection
        // for open, change and close text document events
        this.documents.listen(this.connection);

        this.documents.onDidChangeContent(this.onDidChangeContent.bind(this));
        this.connection.onHover(this.onHover.bind(this));
        this.connection.onDefinition(this.onDefinition.bind(this));
        this.connection.onWorkspaceSymbol(this.onWorkspaceSymbol.bind(this));
        this.connection.onDidChangeWatchedFiles(this.onDidChangeWatchedFiles.bind(this));
        this.connection.onDocumentHighlight(this.onDocumentHighlight.bind(this));
        this.connection.onReferences(this.onReferences.bind(this));
        this.connection.onDocumentSymbol(this.onDocumentSymbol.bind(this));
        this.connection.onCompletion(this.onCompletion.bind(this));
        this.connection.onCompletionResolve(this.onCompletionResolve.bind(this));
        this.connection.onPrepareRename(this.onPrepareRename.bind(this));
        this.connection.onRenameRequest(this.onRenameRequest.bind(this));
        this.connection.onSignatureHelp(this.onSignatureHelp.bind(this));
        this.connection.onNotification('$/analyze-server-cache', (code => this.analyzer.analyzeServerCache(code)));
    }

    public static async initialize(
        connection: Connection,
        { rootPath }: InitializeParams,
    ): Promise<QLangServer> {
        connection.console.info(`Initializing q Lang Server at ${rootPath}`);
        const parser = await initializeParser();
        return QAnalyzer.fromRoot(connection, rootPath, parser).then(
            analyzer => { return new QLangServer(connection, analyzer); }
        );
    }


    public capabilities(): ServerCapabilities {
        return {
            textDocumentSync: TextDocumentSyncKind.Full,
            completionProvider: {
                resolveProvider: true,
            },
            hoverProvider: true,
            documentHighlightProvider: true,
            definitionProvider: true,
            documentSymbolProvider: true,
            workspaceSymbolProvider: true,
            referencesProvider: true,
            renameProvider: {
                prepareProvider: true
            },
            signatureHelpProvider: {
                triggerCharacters: ['['],
                retriggerCharacters: [';']
            },
        };
    }

    // todo - when add more rules, extract to a package
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private onDidChangeContent(change: any) {
        this.connection.console.info(`Analyzing ${change.document.uri}`);
        this.analyzer.analyze(change.document.uri, change.document);
        const diagnostics = this.validateTextDocument(change.document);
        // Send the computed diagnostics to VSCode.
        this.connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
    }

    private onDidChangeWatchedFiles(change: DidChangeWatchedFilesParams) {
        this.connection.console.info('Received file change event(s)');
        change.changes.forEach(event => {
            if (/.*\/src\/.*\.q/.test(event.uri)) {
                if (event.type === FileChangeType.Deleted) {
                    this.analyzer.remove(event.uri);
                } else {
                    const fileContent = fs.readFileSync(event.uri, 'utf8');
                    this.connection.console.info(`Analyzing ${event.uri}`);
                    this.analyzer.analyze(event.uri, TextDocument.create(event.uri, 'q', 1, fileContent));
                }

            }
        });
    }

    private onCompletion(params: TextDocumentPositionParams): CompletionItem[] {
        const word = this.getWordAtPoint({
            ...params,
            position: {
                line: params.position.line,
                // Go one character back to get completion on the current word
                character: Math.max(params.position.character - 1, 0),
            },
        });

        let symbols: string[] = [];
        let localId: string[] = [];
        let globalId: string[] = [];
        let completionItem: CompletionItem[] = [];
        // console.log(word?.text)

        if (word?.text.startsWith('.')) {
            completionItem = this.buildInFsRef.filter(item => item.label.startsWith('.'));
            globalId = this.analyzer.getServerIds().concat(
                this.analyzer.getAllSymbols().map(sym => sym.name)).filter(id => id.startsWith('.'));
            new Set(globalId).forEach(id => completionItem.push(CompletionItem.create(id)));
        } else if (word?.text.startsWith('`')) {
            symbols = this.analyzer.getSyms(params.textDocument.uri);
            new Set(symbols).forEach(id => completionItem.push(CompletionItem.create(id)));
        } else {
            completionItem = this.buildInFsRef.filter(item => !item.label.startsWith('.'));
            localId = this.analyzer.getServerIds().filter(id => !id.startsWith('.')).concat(
                this.analyzer.getLocalIds(params.textDocument.uri, word?.containerName ?? '')
            );
            new Set(localId).forEach(id => completionItem.push(CompletionItem.create(id)));
        }
        // console.log(completionItem)s
        return completionItem;
    }

    private async onCompletionResolve(
        item: CompletionItem,
    ): Promise<CompletionItem> {
        return item;
    }


    private onDefinition(params: TextDocumentPositionParams): Location[] {
        const word = this.getWordAtPoint(params);
        // this.logRequest('onDefinition', params, word);
        if (!word) {
            return [];
        }
        return this.analyzer.findDefinition(word, params.textDocument.uri);
    }

    private onWorkspaceSymbol(params: WorkspaceSymbolParams): SymbolInformation[] {
        return this.analyzer.search(params.query);
    }

    private onDocumentHighlight(
        params: TextDocumentPositionParams,
    ): DocumentHighlight[] | null {
        const word = this.getWordAtPoint(params);
        // this.logRequest('onDocumentHighlight', params, word)
        if (!word) {
            return [];
        }
        return this.analyzer.findSynNodeLocations(params.textDocument.uri, word)
            .map(syn => { return { range: syn.range }; });
    }

    private onReferences(params: ReferenceParams): Location[] | null {
        const word = this.getWordAtPoint(params);
        // this.logRequest('onReferences', params, word)
        if (!word) {
            return null;
        }
        return this.analyzer.findReferences(word, params.textDocument.uri);
    }

    // todo: limit to global and null container
    private onDocumentSymbol(params: DocumentSymbolParams): SymbolInformation[] {
        // this.connection.console.log(`onDocumentSymbol`)
        return this.analyzer.findSymbolsForFile(params.textDocument.uri);
    }

    private onPrepareRename(params: PrepareRenameParams): Range | null {
        const word = this.getWordAtPoint(params);
        if (word?.type === 'local_identifier' || word?.type === 'global_identifier') {
            return word.range;
        }
        return null;
    }

    private onRenameRequest(params: RenameParams): WorkspaceEdit | null | undefined {
        const word = this.getWordAtPoint(params);
        const changes: { [uri: string]: TextEdit[] } = {};
        if (word) {
            const locations = this.analyzer.findReferences(word, params.textDocument.uri);
            locations.map(location => {
                if (!changes[location.uri])
                    changes[location.uri] = [];
                changes[location.uri]
                    .push(TextEdit.replace(location.range, params.newName));
            });
        }
        if (changes)
            return { changes: changes };
    }

    private onSignatureHelp(params: SignatureHelpParams): SignatureHelp | undefined {
        // it is call and get its parent text
        return this.getSigHelpAtPoint(params);
    }

    private validateTextDocument(textDocument: TextDocument): Diagnostic[] {
        const text = textDocument.getText();
        const pattern = /^[}\])]/gm;
        let m: RegExpExecArray | null;

        const diagnostics: Diagnostic[] = [];
        while ((m = pattern.exec(text)) !== null) {
            const diagnostic: Diagnostic = {
                severity: DiagnosticSeverity.Error,
                range: {
                    start: textDocument.positionAt(m.index),
                    end: textDocument.positionAt(m.index + m[0].length)
                },
                message: `require a space before ${m[0]}`,
                source: 'q-lang-server'
            };
            diagnostic.relatedInformation = [
                {
                    location: {
                        uri: textDocument.uri,
                        range: Object.assign({}, diagnostic.range)
                    },
                    message: 'Multiline expressions'
                }
            ];
            diagnostics.push(diagnostic);
        }
        return diagnostics;
    }

    private async onHover(params: TextDocumentPositionParams): Promise<Hover | null> {
        const word = this.getWordAtPoint(params);
        // const currentUri = params.textDocument.uri;

        // this.logRequest('onHover', params, word)

        if (!word) {
            return null;
        }

        const ref = this.buildInFsRef.filter(item => item.label === word.text)[0];

        if (ref) {
            const markupContent: MarkupContent = {
                kind: MarkupKind.PlainText,
                value: [ref.detail, ref.documentation].join('\n')
            };
            return { contents: markupContent };
        }

        // let symbols: SymbolInformation[] = [];
        // symbols = this.analyzer.findSymbolsForFile(currentUri);
        // symbols = symbols.filter(
        //     sym =>
        //         sym.containerName === word.containerName && sym.location.range.start.line !== params.position.line)
        // if (word.containerName==='') {
        //     symbols.concat(
        //         this.analyzer.findSymbolsMatchingWord(true, word.text)
        //         .filter(sym=>sym.location.range.start.line!==params.position.line)
        //         );
        // }

        // if (symbols.length === 1) {
        //     return { contents: symbols[0] }
        // }

        return null;
    }

    private getWordAtPoint(
        params: ReferenceParams | TextDocumentPositionParams,
    ): word | null {
        return this.analyzer.wordAtPoint(
            params.textDocument.uri,
            params.position.line,
            params.position.character,
        );
    }

    private getSigHelpAtPoint(
        params: ReferenceParams | TextDocumentPositionParams,
    ): SignatureHelp | undefined {
        const node = this.analyzer.getNodeAtPoint(
            params.textDocument.uri,
            params.position.line,
            params.position.character,
        );
        if (node) {
            const callNode = this.analyzer.getCallNode(node);
            const sigHelp = this.analyzer.getSigHelp(callNode?.firstNamedChild?.text ?? '');
            if (callNode && sigHelp) {
                let child = callNode.firstNamedChild!;
                let index = -1;
                while (child.nextNamedSibling !== null && node.startIndex > child.endIndex) {
                    index += 1;
                    child = child.nextNamedSibling;
                }
                sigHelp.activeParameter = index;
                return sigHelp;
            }

        }
        return undefined;
    }

    private logRequest(
        request: string,
        params: ReferenceParams | TextDocumentPositionParams,
        word?: word | null
    ) {
        const wordLog = word ? JSON.stringify(word) : 'null';
        this.connection.console.info(
            `${request} ${params.position.line}:${params.position.character} word=${wordLog}`,
        );
    }
}