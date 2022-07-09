const fs = require('graceful-fs');
const Parser = require('web-tree-sitter');

let qParser = null;

async function getParser() {
    if (qParser) {
        return qParser

    }
    await Parser.init();
    qParser = new Parser();
    const lang = await Parser.Language.load('assets/tree-sitter-q.wasm');
    qParser.setLanguage(lang);
    return qParser;
}

test("test", async () => {
    const p = await getParser();
    const fileContent = fs.readFileSync('test/data/test.q', 'utf-8')
    const t = p.parse(fileContent);
    expect(t.rootNode.namedDescendantForPosition({ row: 2, column: 11 }).type).toBe("call")
})
