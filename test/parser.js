const Parser = require('web-tree-sitter');
async function initializeParser() {
    await Parser.init();
    const qParser = new Parser();

    const lang = await Parser.Language.load('assets/tree-sitter-q.wasm');

    qParser.setLanguage(lang);
    return qParser;
}

initializeParser().then((parser) => {
    const p = parser;
    console.log('test');
    const t = p.parse('a:42;');
    console.log(t.rootNode.toString());
});
