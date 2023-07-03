import Fuse from 'fuse.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
    CallHierarchyItem, CompletionItem,
    CompletionItemKind, Connection, Diagnostic, DiagnosticSeverity,
    DocumentUri, Location, ParameterInformation,
    Range, SemanticTokens, SemanticTokensBuilder,
    SignatureHelp, SignatureInformation, SymbolInformation, SymbolKind
} from 'vscode-languageserver/node';
import { URI } from 'vscode-uri';
import * as Parser from 'web-tree-sitter';
import { buildInFs, buildInFsSigs } from '../util/build-in-fs';
import * as TreeSitterUtil from '../util/tree-sitter';

import fs from 'graceful-fs';
import klaw from 'klaw';
import picomatch from 'picomatch';

type nameToSymbolInfo = Map<string, SymbolInformation[]>;
type nameToCallHierarchy = Map<string, CallHierarchyItem[]>;
type nameToGlobalId = Map<string, string[]>;

export type word = {
    type: string,
    text: string,
    range: Range,
    containerName: string,
}
/**
 * The Analyzer analyze Abstract Syntax Trees of tree-sitter-q
 */
export default class Analyzer {
    static matchFile: (test: string) => boolean;
    private connection: Connection;
    private rootPath: string | undefined | null;
    private reservedWord: string[];
    private buildInFsSigSrc: string;
    public static async fromRoot(
        connection: Connection,
        workspaceFolder: string,
        parser: Parser
    ): Promise<Analyzer> {
        return new Analyzer(parser, connection, workspaceFolder);
    }

    private parser: Parser;
    private uriToTextDocument = new Map<string, TextDocument>();
    private uriToTree = new Map<DocumentUri, Parser.Tree>();
    private uriToFileContent = new Map<DocumentUri, string>();
    private uriToDefinition = new Map<DocumentUri, nameToSymbolInfo>();
    private uriToSymbol = new Map<DocumentUri, string[]>();
    private uriToSemanticTokes = new Map<DocumentUri, SemanticTokensBuilder>();
    private nameToSigHelp = new Map<string, SignatureHelp>();
    private serverIds: CompletionItem[] = [];
    private serverSyms: string[] = [];
    private uriToCallHierarchy = new Map<string, nameToCallHierarchy>();
    private uriToGlobalId = new Map<string, nameToGlobalId>();
    private workspaceFolder: URI;
    private uriToLoadFile = new Map<DocumentUri, string[]>();

    public constructor(parser: Parser, connection: Connection, workspaceFolder: string) {
        this.parser = parser;
        this.connection = connection;
        this.workspaceFolder = URI.parse(workspaceFolder);
        this.rootPath = this.workspaceFolder.fsPath;
        this.reservedWord = buildInFs.map(item => item.label);
        this.buildInFsSigSrc = buildInFsSigs;
    }

    /**
     * Find all the definition locations
     */
    public getDefinitionByUriWord(uri: string, word: word): Location[] {
        let symbols: SymbolInformation[] = [];

        // search local id for current file, current function
        if (word.type === 'local_identifier') {
            symbols = this.uriToDefinition.get(uri)?.get(word.text)?.filter(
                sym => sym.containerName === word.containerName
            ) ?? [];
        }

        // if nothing found, search globally
        if (symbols.length == 0)
            this.uriToDefinition.forEach(nameToSymInfo => {
                symbols.push(...nameToSymInfo.get(word.text) || []);
            });

        return symbols.map(s => s.location);
    }

    /**
     * Find all the symbols matching the query using fuzzy search.
     */
    public search(query: string): SymbolInformation[] {
        const fuse = new Fuse(this.getAllSymbols(), { keys: ['name'] });
        return fuse.search(query).map(result => result.item) as SymbolInformation[];
    }

    /**
     * Find all the reference locations
     */
    public findReferences(word: word, uri: string): Location[] {
        let locations: Location[] = [];

        if (word.type === 'global_identifier' || word.containerName === '') {
            // find in all files
            this.uriToTree.forEach((_, u) => locations.push(...this.getSynNodeLocationsByUriWord(u, word)));
        } else {
            // find in current file
            locations = this.getSynNodeLocationsByUriWord(uri, word);
        }
        return locations;
    }


    /**
     * Find all syntax nodes of name in the given file.
     */
    public getSynNodesByUriWord(uri: string, word: word): Parser.SyntaxNode[] {
        const tree = this.uriToTree.get(uri);
        const content = this.uriToFileContent.get(uri);
        const synNodes: Parser.SyntaxNode[] = [];

        if (tree && content) {
            TreeSitterUtil.forEach(tree.rootNode, n => {
                // global identifier or constant symbol
                if (TreeSitterUtil.isReference(n) && (n.text.trim() === word.text || n.text.trim().substring(1) === word.text))
                    synNodes.push(n);
            });
        }

        if (word.type === 'global_identifier' || word.containerName === '') {
            return synNodes;
        } else {
            return synNodes.filter(syn => this.getContainerName(syn) === word.containerName);
        }
    }

    public getSynNodeLocationsByUriWord(uri: string, word: word): Location[] {
        const synNodes = this.getSynNodesByUriWord(uri, word);
        return synNodes.map(syn => Location.create(uri, TreeSitterUtil.range(syn)));
    }


    public getSynNodeByType(uri: string, type: string): Parser.SyntaxNode[] {
        const tree = this.uriToTree.get(uri);
        const synNodes: Parser.SyntaxNode[] = [];
        if (tree) {
            TreeSitterUtil.forEach(tree.rootNode, n => {
                if (n.type === type) {
                    synNodes.push(n);
                }
            });
        }
        return synNodes;
    }

    /**
     * Find all occurrences of name in the given file.
     * It's currently not scope-aware.
     */
    public findOccurrences(uri: string, query: string): Location[] {
        const tree = this.uriToTree.get(uri);
        const content = this.uriToFileContent.get(uri);
        const locations: Location[] = [];

        if (tree && content) {
            TreeSitterUtil.forEach(tree.rootNode, n => {
                if (TreeSitterUtil.isReference(n) && n.text.trim() === query) {
                    locations.push(Location.create(uri, TreeSitterUtil.range(n)));
                }
            });
        }
        return locations;
    }

    /**
     * Find all symbol definitions in the given file.
     */
    public getSymbolsByUri(uri: string): SymbolInformation[] {
        const nameToSymInfos = this.uriToDefinition.get(uri)?.values();
        return nameToSymInfos ? Array.from(nameToSymInfos).flat() : [];
    }

    /**
     * Find symbol completions for the given word.
     */
    public findSymbolsMatchingWord(
        exactMatch: boolean,
        word: string,
    ): SymbolInformation[] {
        const symbols: SymbolInformation[] = [];

        this.uriToDefinition.forEach((nameToSymInfo) => {
            nameToSymInfo.forEach((syms, name) => {
                const match = exactMatch ? name === word : name.startsWith(word);
                if (match) {
                    symbols.push(...syms);
                }
            });
        });

        return symbols;
    }

    public analyzeWorkspace(cfg: { globsPattern: string[]; ignorePattern: string[] }): void {
        if (this.rootPath && fs.existsSync(this.rootPath)) {

            this.uriToTextDocument = new Map<string, TextDocument>();
            this.uriToTree = new Map<DocumentUri, Parser.Tree>();
            this.uriToFileContent = new Map<DocumentUri, string>();
            this.uriToDefinition = new Map<DocumentUri, nameToSymbolInfo>();
            this.uriToSymbol = new Map<DocumentUri, string[]>();
            this.nameToSigHelp = new Map<string, SignatureHelp>();

            const globsPattern = cfg.globsPattern ?? ['**/src/**/*.q'];
            const ignorePattern = cfg.ignorePattern ?? ['**/tmp'];

            this.connection.console.info(
                `Analyzing files matching glob "${globsPattern}" inside ${this.rootPath}`,
            );

            const lookupStartTime = Date.now();
            const getTimePassed = (): string =>
                `${(Date.now() - lookupStartTime) / 1000} seconds`;

            const ignoreMatch = picomatch(ignorePattern);
            const includeMatch = picomatch(globsPattern);
            Analyzer.matchFile = (test) => !ignoreMatch(test) && includeMatch(test);
            const qSrcFiles: string[] = [];
            klaw(this.rootPath, { filter: item => !ignoreMatch(item) })
                .on('error', (err: Error, _item: klaw.Item) => {
                    this.connection.console.warn(err.message);
                })
                .on('data', item => { if (includeMatch(item.path)) qSrcFiles.push(item.path); })
                .on('end', () => {
                    if (qSrcFiles.length == 0) {
                        this.connection.console.warn(
                            `Failed to find any source files using the glob "${globsPattern}". Some feature will not be available.`,
                        );
                    } else {
                        this.connection.console.info(
                            `Glob found ${qSrcFiles.length} files after ${getTimePassed()}`,
                        );

                        qSrcFiles.forEach((filepath: string) => this.analyzeFile(filepath));
                        this.uriToLoadFile.forEach((_, uri) => this.analyzeLoadFiles(uri));

                        this.connection.console.info(`Analyzing took ${getTimePassed()}`);
                    }

                });
            this.analyzeServerCache('');
        }

    }

    public analyzeLoadFiles(uri: DocumentUri): void {
        this.uriToLoadFile.get(uri)?.forEach(f => {
            if (!this.uriToTree.get(URI.file(f).toString()))
                this.analyzeFile(f);
        });
    }

    public analyzeFile(filepath: string): void {
        const uri = URI.file(filepath).toString();
        try {
            const fileContent = fs.readFileSync(filepath, 'utf8');
            this.connection.console.info(`Analyzing ${uri}`);
            this.analyzeDoc(uri, TextDocument.create(uri, 'q', 1, fileContent));
        } catch (error) {
            const { message } = error as Error;
            this.connection.console.warn(`Failed analyzing ${uri}.`);
            this.connection.console.warn(`Error: ${message}`);
        }
    }

    /**
     * Analyze the given document, cache the tree-sitter AST, and iterate over the
     * tree to find declarations.
     * Returns all, if any, syntax errors that occurred while parsing the file.
     */
    public analyzeDoc(uri: DocumentUri, document: TextDocument): Diagnostic[] {
        const content = document.getText();
        const tree = this.parser.parse(content);

        this.uriToTextDocument.set(uri, document);
        this.uriToTree.set(uri, tree);
        this.uriToDefinition.set(uri, new Map<string, SymbolInformation[]>());
        this.uriToFileContent.set(uri, content);
        this.uriToSymbol.set(uri, []);
        this.uriToSemanticTokes.set(uri, new SemanticTokensBuilder());
        const callHierarchyMap = new Map<string, CallHierarchyItem[]>();
        this.uriToCallHierarchy.set(uri, callHierarchyMap);
        const globalIdMap = new Map<string, string[]>();
        this.uriToGlobalId.set(uri, globalIdMap);
        this.uriToLoadFile.set(uri, []);

        const problems: Diagnostic[] = [];

        let namespace = '';
        // store semantic tokens
        const tokens: number[][] = [];
        TreeSitterUtil.forEach(tree.rootNode, (n: Parser.SyntaxNode) => {
            if (n.type === 'ERROR') {
                problems.push(
                    Diagnostic.create(
                        TreeSitterUtil.range(n),
                        'Failed to parse expression',
                        DiagnosticSeverity.Error,
                    ),
                );
                return;
            } else if (TreeSitterUtil.isDefinition(n)) {
                const named = n.firstChild;
                if (named === null) {
                    return;
                }
                const containerName = this.getContainerName(n) ?? '';
                const name = (namespace === '' || named.type === 'global_identifier') ? named.text.trim() : `${namespace}.${named.text.trim()}`;
                let symbolKind = SymbolKind.Variable as SymbolKind;
                const defNode = n.children[2]?.firstChild;
                if (defNode?.type === 'function_body')
                    symbolKind = SymbolKind.Function;

                // won't do further analysis of local identifier in functions
                if (containerName !== '' && namespace === '' && named.type === 'local_identifier') {
                    this.pushSymInfo(name, uri, n, containerName, symbolKind);
                    return;
                }

                if (defNode?.type === 'function_body' && defNode?.firstNamedChild?.type === 'formal_parameters') {
                    symbolKind = SymbolKind.Function;
                    const paramNodes = defNode.firstNamedChild.namedChildren;
                    const params = TreeSitterUtil.extractParams(defNode).map(param => ParameterInformation.create(param));
                    if (params.length > 0) {
                        const sigInfo = SignatureInformation.create(`${name}[${params.map(p => p.label).join(';')}]`, undefined, ...params);
                        this.nameToSigHelp.set(name, {
                            signatures: [sigInfo],
                            activeParameter: 0,
                            activeSignature: 0
                        });
                        paramNodes.forEach(n => {
                            this.pushSymInfo(n.text, uri, n, name, SymbolKind.Variable);
                        });
                    }
                } else if (defNode?.type === 'call' && defNode.firstNamedChild) {
                    // parse projection if it is a function_body node
                    let params: ParameterInformation[] = [];
                    if (defNode.firstNamedChild.type === 'function_body') {
                        const paramNodes = defNode.firstNamedChild.firstNamedChild?.namedChildren;
                        params = TreeSitterUtil.extractParams(defNode.firstNamedChild).map(param => ParameterInformation.create(param));
                        if (params.length > 0 && paramNodes) {
                            paramNodes.forEach(n => {
                                this.pushSymInfo(n.text, uri, n, this.getContainerName(n), SymbolKind.Variable);
                            });
                        }
                    } else if (TreeSitterUtil.isReference(defNode.firstNamedChild)) {
                        params = this.getSigHelp(defNode.firstNamedChild.text)?.signatures[0].parameters ?? [];
                    }

                    const projections = defNode.namedChildren.map(n => n.type !== 'null_statement');
                    // remove first child (function_body)
                    projections.shift();
                    // filter null_statement or undefined
                    params = params.filter((_, i) => !projections[i]);
                    if (params.length > 0) {
                        symbolKind = SymbolKind.Function;
                        const sigInfo = SignatureInformation.create(`${name}[${params.map(p => p.label).join(';')}]`, undefined, ...params);
                        this.nameToSigHelp.set(name, {
                            signatures: [sigInfo],
                            activeParameter: 0,
                            activeSignature: 0
                        });
                    }
                }
                this.pushSymInfo(name, uri, n, containerName, symbolKind);

            } else if (TreeSitterUtil.isSeparator(n)) {
                if (n.text[0] !== ';') {
                    problems.push(
                        Diagnostic.create(
                            TreeSitterUtil.range(n),
                            'Missing a semicolon',
                            DiagnosticSeverity.Hint,
                        ),
                    );
                }
            } else if (TreeSitterUtil.isNamespace(n)) {
                namespace = n.firstChild?.text ?? '';
            } else if (TreeSitterUtil.isNamespaceEnd(n)) {
                namespace = '';
            } else if (TreeSitterUtil.isSymbol(n)) {
                this.uriToSymbol.get(uri)?.push(n.text.trim());
            } else if (TreeSitterUtil.isFunctionBody(n)) {
                // tokenTypes: ['variable', 'parameter', 'type', 'class']
                const params = TreeSitterUtil.hasParams(n)
                    ? TreeSitterUtil.extractParams(n).filter(param => !this.reservedWord.includes(param))
                    : ['x', 'y', 'z'];
                TreeSitterUtil.forEachAndSkip(n, 'function_body', node => {
                    if (params.length > 0 && node.type === 'local_identifier') {
                        const param = node.text.trim();
                        if (params.includes(param)) {
                            // 1 means parameter type here
                            const token = TreeSitterUtil.token(node);
                            token.push(1, 0);
                            tokens.push(token);
                        }
                    } else if (node.type === 'global_identifier') {
                        const name = node.text.trim();
                        const callHierarchy = callHierarchyMap.get(name) ?? [];
                        const containerName = this.getContainerName(node);
                        const globalId = globalIdMap.get(containerName) ?? [];
                        callHierarchy.push({
                            kind: SymbolKind.Function,
                            name: containerName,
                            range: TreeSitterUtil.range(node),
                            selectionRange: TreeSitterUtil.range(node),
                            uri: uri,
                            data: name
                        });
                        callHierarchyMap.set(name, callHierarchy);
                        globalId.push(name);
                        globalIdMap.set(containerName, globalId);
                    }
                });

            } else if (TreeSitterUtil.isLoadingFile(n)) {
                const matches = n.text.match(/(\/[^/ ]*)+\.q/);
                if (matches) {
                    this.uriToLoadFile.get(uri)?.push(matches[0]);
                }
            }
        });

        const semanticTokensBuilder = this.uriToSemanticTokes.get(uri) ?? new SemanticTokensBuilder();
        tokens.sort(
            (t1, t2) => (t1[0] == t2[0] ? t1[1] - t2[1] : t1[0] - t2[0]))
            .forEach(token => semanticTokensBuilder.push(token[0], token[1], token[2], token[3], token[4]));

        function findMissingNodes(node: Parser.SyntaxNode) {
            if (node.isMissing()) {
                problems.push(
                    Diagnostic.create(
                        TreeSitterUtil.range(node),
                        `Syntax error: expected "${node.type}" somewhere in the file`,
                        DiagnosticSeverity.Warning,
                    ),
                );
            } else if (node.hasError()) {
                node.children.forEach(findMissingNodes);
            }
        }

        findMissingNodes(tree.rootNode);
        return problems;
    }

    public analyzeServerCache(content: string): void {
        // load build in functions signatures here
        const source = this.buildInFsSigSrc + content;
        const tree = this.parser.parse(source);
        this.serverIds = [];
        this.serverSyms = [];
        TreeSitterUtil.forEach(tree.rootNode, (n: Parser.SyntaxNode) => {
            if (TreeSitterUtil.isDefinition(n)) {
                const named = n.firstChild;
                if (named === null) {
                    return;
                }
                const name = named.text.trim();
                const defNode = n.children[2]?.firstChild;

                let completionItemKind = CompletionItemKind.Variable as CompletionItemKind;

                if (defNode?.type === 'function_body' && defNode?.firstNamedChild?.type === 'formal_parameters') {
                    completionItemKind = CompletionItemKind.Function;
                    const params = TreeSitterUtil.extractParams(defNode).map(param => ParameterInformation.create(param));
                    if (params.length > 0) {
                        const sigInfo = SignatureInformation.create(`${name}[${params.map(p => p.label).join(';')}]`, undefined, ...params);
                        this.nameToSigHelp.set(name, {
                            signatures: [sigInfo],
                            activeParameter: 0,
                            activeSignature: 0
                        });
                    }
                } else if (defNode?.type === 'call' && defNode.firstNamedChild) {
                    // parse projection if it is a function_body node
                    let params: ParameterInformation[] = [];
                    if (defNode.firstNamedChild.type === 'function_body') {
                        params = TreeSitterUtil.extractParams(defNode.firstNamedChild).map(param => ParameterInformation.create(param));
                    } else if (TreeSitterUtil.isReference(defNode.firstNamedChild)) {
                        params = this.getSigHelp(defNode.firstNamedChild.text)?.signatures[0].parameters ?? [];
                    }

                    const projections = defNode.namedChildren.map(n => n.type !== 'null_statement');
                    // remove first child (function_body)
                    projections.shift();
                    // filter null_statement or undefined
                    params = params.filter((_, i) => !projections[i]);
                    if (params.length > 0) {
                        completionItemKind = CompletionItemKind.Function;
                        const sigInfo = SignatureInformation.create(`${name}[${params.map(p => p.label).join(';')}]`, undefined, ...params);
                        this.nameToSigHelp.set(name, {
                            signatures: [sigInfo],
                            activeParameter: 0,
                            activeSignature: 0
                        });
                    }
                }

                this.serverIds.push({ label: name, kind: completionItemKind });

            } else if (TreeSitterUtil.isSymbol(n)) {
                if (this.getContainerName(n) === '')
                    this.serverSyms.push(n.text.trim());
            }
        });
    }

    public remove(uri: string): void {
        this.uriToTextDocument.delete(uri);
        this.uriToTree.delete(uri);
        this.uriToDefinition.delete(uri);
        this.uriToFileContent.delete(uri);
    }

    /**
     * find its container, basically the function name
     * @param n
     * @param content
     */
    private getContainerName(n: Parser.SyntaxNode): string {
        const body = TreeSitterUtil.findParent(n, p => p.type === 'function_body');
        if (body?.parent?.type === 'expression_statement') {
            if (body?.parent?.parent?.type === 'assignment') {
                const assignment = body.parent.parent;
                // 2nd - right side is body itself
                if (assignment?.namedChild(1)?.firstNamedChild?.type === 'function_body') {
                    const functionNamed = assignment.firstNamedChild;
                    return functionNamed?.text.trim() ?? '';
                }
            } else {
                return `LAMBDA-${body.parent.startPosition.row}-${body.parent.startPosition.column}`;
            }
        } else if (body?.parent?.type === 'call') {
            return `LAMBDA-${body.parent.startPosition.row}-${body.parent.startPosition.column}`;
        }
        return '';
    }

    /**
     * Find the full word at the given point.
     */
    public wordAtPoint(uri: string, line: number, column: number): word | null {
        const document = this.uriToTree.get(uri);

        if (!document?.rootNode) {
            return null;
        }

        const node = document.rootNode.descendantForPosition({ row: line, column });

        if (!node || node.childCount > 0 || node.text.trim() === '') {
            return null;
        }

        return {
            type: node.type,
            text: node.text.trim(),
            range: TreeSitterUtil.range(node),
            containerName: this.getContainerName(node)
        };
    }

    public getCallNode(n: Parser.SyntaxNode): Parser.SyntaxNode | null {
        const call = TreeSitterUtil.findParentNotInTypes(n,
            ['table', 'exit_statement', 'function_exit_expression', 'ctrl_statement', 'function_ctrl_expression', 'formal_parameters'],
            p => p.type === 'call');
        return call;
    }

    public getLv1Node(n: Parser.SyntaxNode): Parser.SyntaxNode {
        return TreeSitterUtil.findParentInRoot(n);
    }

    public getNodeAtPoint(uri: string, line: number, column: number): Parser.SyntaxNode | null {
        const document = this.uriToTree.get(uri);
        if (!document?.rootNode) {
            return null;
        }
        return document.rootNode.descendantForPosition({ row: line, column });
    }

    public getNonNullNodeAtPoint(uri: string, line: number, column: number): Parser.SyntaxNode | null {
        const node = this.getNodeAtPoint(uri, line, column);
        if (!node || node.childCount > 0 || node.text.trim() === '') {
            return null;
        }
        return node;
    }

    public getAllVariableSymbols(): SymbolInformation[] {
        return this.getAllSymbols().filter(symbol => symbol.kind === SymbolKind.Variable);
    }

    public getAllSymbols(): SymbolInformation[] {
        const symbols: SymbolInformation[] = [];
        this.uriToDefinition.forEach((nameToSymInfo) => {
            nameToSymInfo.forEach((sym) => symbols.push(...sym));
        });
        return symbols;
    }

    public getSigHelp(query: string): SignatureHelp | undefined {
        return this.nameToSigHelp.get(query);
    }

    public getServerIds(): CompletionItem[] {
        return this.serverIds;
    }

    public getSymsForUri(uri: DocumentUri): string[] {
        const srcSyms = this.uriToSymbol.get(uri) ?? [];
        return this.serverSyms.concat(srcSyms);
    }

    public getLocalIds(uri: DocumentUri, containerName: string): SymbolInformation[] {
        // local ids as global variables
        const ids = this.getAllSymbols().filter(s => !s.containerName && !s.name.startsWith('.'));
        // local variables
        if (containerName !== '') {
            this.uriToDefinition.get(uri)?.forEach(symInfos => symInfos.forEach(s => {
                if (s.containerName === containerName)
                    ids.push(s);
            }));
        }
        return ids;
    }

    public pushSymInfo(name: string, uri: string, node: Parser.SyntaxNode, containerName: string, kind: SymbolKind): void {
        const def = this.uriToDefinition.get(uri)?.get(name);
        const symInfo = SymbolInformation.create(
            name,
            kind,
            TreeSitterUtil.range(node),
            uri,
            containerName
        );
        if (def) {
            def.push(symInfo);
        } else {
            this.uriToDefinition.get(uri)?.set(name, [symInfo]);
        }
    }

    public getSemanticTokens(uri: DocumentUri): SemanticTokens {
        return this.uriToSemanticTokes.get(uri)?.build() ?? { data: [] };
    }

    public getCallHierarchyItemByUriWord(uri: string, word: string): CallHierarchyItem[] {
        return this.uriToCallHierarchy.get(uri)?.get(word) ?? [];
    }

    public getCallHierarchyItemByWord(word: string): CallHierarchyItem[] {
        return Array.from(this.uriToCallHierarchy.values()).flat(1).map(map => map.get(word) ?? []).flat(1);
    }

    public getGlobalIdByUriContainerName(uri: string, containerName: string): string[] {
        return this.uriToGlobalId.get(uri)?.get(containerName) ?? [];
    }
}
