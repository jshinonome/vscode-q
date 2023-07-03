import fs from 'fs';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
    CompletionItem, CompletionItemKind, Connection, Diagnostic, DiagnosticSeverity,
    DidChangeWatchedFilesParams, DocumentHighlight, DocumentSymbolParams, FileChangeType, Hover,
    InitializeParams, Location, PrepareRenameParams, Range, ReferenceParams, RenameParams,
    SemanticTokens, SemanticTokensParams, ServerCapabilities, SignatureHelp, SignatureHelpParams, SymbolInformation, SymbolKind, TextDocumentPositionParams, TextDocuments, TextDocumentSyncKind, TextEdit, WorkspaceEdit, WorkspaceSymbolParams
} from 'vscode-languageserver/node';
import { URI } from 'vscode-uri';
import Analyzer, { word } from './modules/analyser';
import CallHierarchyProvider from './modules/call-hierarchy-provider';
import { buildInFs } from './util/build-in-fs';
import { initializeParser } from './util/parser';

export default class LangServer {
    connection: Connection;
    // Create a simple text document manager. The text document manager
    // supports full document sync only
    documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

    buildInFsRef: CompletionItem[] = [];
    hoverMap = new Map<string, string>();

    private analyzer: Analyzer;
    private callHierarchyProvider: CallHierarchyProvider;

    private constructor(connection: Connection, analyzer: Analyzer) {
        this.connection = connection;
        this.analyzer = analyzer;
        this.buildInFsRef = buildInFs;
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
        this.connection.onNotification('analyzeServerCache', (code => this.analyzer.analyzeServerCache(code)));
        this.connection.onNotification('analyzeSourceCode', (cfg => this.analyzer.analyzeWorkspace(cfg)));
        this.connection.onNotification('prepareOnHover', (hoverItems => this.generateHoverMap(hoverItems)));
        this.connection.onRequest('onQueryBlock', (params => this.onQueryBlock(params)));

        this.callHierarchyProvider = new CallHierarchyProvider(analyzer);
        this.connection.languages.callHierarchy.onPrepare(this.callHierarchyProvider.onPrepare.bind(this));
        this.connection.languages.callHierarchy.onIncomingCalls(this.callHierarchyProvider.onIncomingCalls.bind(this));
        this.connection.languages.callHierarchy.onOutgoingCalls(this.callHierarchyProvider.onOutgoingCalls.bind(this));

        this.connection.languages.semanticTokens.on(this.onSemanticsToken.bind(this));
    }

    public static async initialize(
        connection: Connection,
        { workspaceFolders }: InitializeParams,
    ): Promise<LangServer> {
        const workspaceFolder = workspaceFolders ? workspaceFolders[0].uri : '';
        connection.console.info(`Initializing q Lang Server at ${workspaceFolder}`);
        console.info(`Initializing q Lang Server at ${workspaceFolder}`);
        const parser = await initializeParser();
        return Analyzer.fromRoot(connection, workspaceFolder, parser).then(
            analyzer => { return new LangServer(connection, analyzer); }
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
                triggerCharacters: ['[', ';'],
            },
            semanticTokensProvider: {
                documentSelector: null,
                legend: {
                    tokenTypes: ['variable', 'parameter', 'type', 'class'],
                    tokenModifiers: []
                },
                full: true,
            },
            callHierarchyProvider: true,
        };
    }

    // todo - when add more rules, extract to a package
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private onDidChangeContent(change: any) {
        this.analyzer.analyzeDoc(change.document.uri, change.document);
        this.analyzer.analyzeLoadFiles(change.document.uri);
        const diagnostics = this.validateTextDocument(change.document);
        // Send the computed diagnostics to VSCode.
        this.connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
    }

    private async onDidChangeWatchedFiles(change: DidChangeWatchedFilesParams) {
        this.connection.console.info('Received file change event(s)');
        const changedFiles: string[] = [];
        change.changes.forEach(event => {
            switch (event.type) {
                case FileChangeType.Deleted:
                    this.connection.console.info(`Removing ${event.uri} from cache`);
                    this.analyzer.remove(event.uri);
                    break;
                default:
                    changedFiles.push(event.uri);
            }
        });
        changedFiles.forEach(file => {
            const filepath = URI.parse(file).fsPath;
            if (!Analyzer.matchFile(filepath))
                return;
            try {
                this.analyzer.analyzeDoc(file, TextDocument.create(file, 'q', 1, fs.readFileSync(filepath, 'utf8')));
                this.analyzer.analyzeLoadFiles(file);
            } catch (error) {
                this.connection.console.warn(`Cannot analyze ${file}`);
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
        let localId: CompletionItem[] = [];
        let globalId: CompletionItem[] = [];
        let completionItem: CompletionItem[] = [];
        // console.log(word?.text)

        if (word?.text.startsWith('.')) {
            completionItem = this.buildInFsRef.filter(item => item.label.startsWith('.'));
            globalId = this.analyzer.getServerIds().filter(item => item.label.startsWith('.')).concat(
                this.analyzer.getAllSymbols()
                    .filter(sym => sym.name.startsWith('.'))
                    .map(sym => {
                        return { label: sym.name, kind: sym.kind === SymbolKind.Function ? CompletionItemKind.Method : CompletionItemKind.Variable };
                    }));
            const flags = new Map<string, boolean>();
            completionItem.forEach(item => flags.set(item.label, true));
            globalId.forEach(item => {
                if (!flags.get(item.label)) {
                    completionItem.push(item);
                    flags.set(item.label, true);
                }
            });
        } else if (word?.text.startsWith('`')) {
            symbols = this.analyzer.getSymsForUri(params.textDocument.uri);
            new Set(symbols).forEach(symbol => {
                completionItem.push({ label: symbol, kind: CompletionItemKind.Enum });
            });
        } else {
            completionItem = this.buildInFsRef.filter(item => !item.label.startsWith('.'));
            localId = this.analyzer.getServerIds().filter(id => !id.label.startsWith('.')).concat(
                this.analyzer.getLocalIds(params.textDocument.uri, word?.containerName ?? '')
                    .map(sym => {
                        return { label: sym.name, kind: sym.kind === SymbolKind.Function ? CompletionItemKind.Method : CompletionItemKind.Variable };
                    }));
            const flags = new Map<string, boolean>();
            completionItem.forEach(item => flags.set(item.label, true));
            localId.forEach(item => {
                if (!flags.get(item.label)) {
                    completionItem.push(item);
                    flags.set(item.label, true);
                }
            });
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
        } else if (word.text.startsWith('`.')) {
            // search constant symbol as global identifier
            word.text = word.text.substring(1);
        }
        return this.analyzer.getDefinitionByUriWord(params.textDocument.uri, word);
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
        return this.analyzer.getSynNodeLocationsByUriWord(params.textDocument.uri, word)
            .map(syn => { return { range: syn.range }; });
    }

    private onReferences(params: ReferenceParams): Location[] | null {
        const word = this.getWordAtPoint(params);
        // this.logRequest('onReferences', params, word)
        if (!word) {
            return null;
        } else if (word.text.startsWith('`.')) {
            // search constant symbol as global identifier
            word.type = 'global_identifier';
            word.text = word.text.substring(1);
        }
        return this.analyzer.findReferences(word, params.textDocument.uri);
    }

    // todo: limit to global and null container
    private onDocumentSymbol(params: DocumentSymbolParams): SymbolInformation[] {
        return this.analyzer.getSymbolsByUri(params.textDocument.uri);
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

    private onSemanticsToken(params: SemanticTokensParams): SemanticTokens {
        // ['variable', 'parameter', 'type', 'class']
        const document = params.textDocument;
        return this.analyzer.getSemanticTokens(document.uri);
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
            const content = {
                language: 'q',
                value: '/ ' + ref.detail + '\n' + ref.documentation as string
            };
            return { contents: content };
        }

        if (this.hoverMap.has(word.text)) {
            const content = {
                language: 'q',
                value: this.hoverMap.get(word.text) ?? ''
            };
            return { contents: content };
        }

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
        const node = this.analyzer.getNonNullNodeAtPoint(
            params.textDocument.uri,
            params.position.line,
            params.position.character,
        );
        if (node) {
            const callNode = this.analyzer.getCallNode(node);
            const sigHelp = this.analyzer.getSigHelp(callNode?.firstNamedChild?.text ?? '');
            if (callNode && sigHelp) {
                let index = -1;
                for (const child of callNode.namedChildren) {
                    if (node.startIndex > child.endIndex)
                        index += 1;
                }
                sigHelp.activeParameter = index;
                return sigHelp;
            }
        }
        return undefined;
    }

    private onQueryBlock(params: TextDocumentPositionParams): { query: string, n: number } {
        const node = this.analyzer.getNodeAtPoint(
            params.textDocument.uri,
            params.position.line,
            params.position.character,
        );

        if (node) {
            const blockNode = this.analyzer.getLv1Node(node);
            return { query: blockNode.text, n: blockNode.endPosition.row + 1 };
        } else {
            return { query: '', n: 0 };
        }
    }

    private generateHoverMap(hoverItems: string[][]): void {
        this.hoverMap = new Map<string, string>();
        hoverItems.forEach(item => {
            this.hoverMap.set(item[0], item[1]);
        });
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
