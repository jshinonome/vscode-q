# q Professional

## Quick start

1. Open the **q Professional** activity bar panel and add a process (**Add Process**).
2. Run **Connect to Process** from the Command Palette (<kbd>ctrl</kbd>+<kbd>shift</kbd>+<kbd>p</kbd>).
3. Open a `.q` or `.k` file and press <kbd>ctrl</kbd>+<kbd>r</kbd> to query the current selection.

Use **Switch Query Mode** to change between Console, Grid, and Visualization output.

## Features

### Editor

- Syntax highlighting for **q** and **k**
- **q notebook** (`*.qnb`) with Console, Grid, and Visualization cell output
- Process tree grouped by tags
- Process Explorer for live server variables
- Query History

### Query modes

- **Console** — text output in an output channel (default)
- **Grid** — filter and sort tables in a webview ([ag-grid-community](https://www.ag-grid.com/) & [plotly](https://plotly.com/javascript/)); nanosecond timestamp precision
- **Visualization** — pivot and virtualize tables ([perspective](https://perspective.finos.org/)); millisecond timestamp precision

### Language server

Powered by [tree-sitter](https://tree-sitter.github.io/tree-sitter/). Works offline on local source files.

- **Linter** and **formatter**
- Rename symbol (<kbd>F2</kbd>)
- Go to definition (<kbd>F12</kbd>)
- Go to references (<kbd>shift</kbd>+<kbd>F12</kbd>)
- Workspace symbol (<kbd>ctrl</kbd>+<kbd>T</kbd>)
- Document highlight and document symbol (<kbd>ctrl</kbd>+<kbd>shift</kbd>+<kbd>O</kbd>)
- Completion (local identifiers, kdb+ process symbols, column names)
- Completion resolve, signature help, semantic highlights, call hierarchy

See the [changelog](https://github.com/jshinonome/vscode-q/blob/main/CHANGELOG.md).

## Configuration

- **User settings:** <kbd>ctrl</kbd>+<kbd>,</kbd>, then filter by `q-pro`.
- **Workspace settings:** Command Palette → `Preferences: Open Workspace Settings`, then filter by `q-pro`.

| configuration                               | type    | default value                          | description                                                                                        |
| ------------------------------------------- | ------- | -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `q-lang-server.sourceFiles.includeGlob`     | array   | `["**/src/**/*.q","**/src/**/*.k"]`    | globs for source files to analyze                                                                  |
| `q-lang-server.sourceFiles.ignoreGlob`      | array   | `["**/build/**","**/node_modules/**"]` | globs to exclude from analysis                                                                     |
| `q-lang-server.trace.server`                | string  | `off`                                  | LSP trace level: `off`, `messages`, or `verbose`                                                   |
| `q-processes.cfg.queryMode`                 | string  | `Console`                              | query mode: `Console`, `Grid`, or `Visualization`                                                  |
| `q-processes.cfg.queryGridDecimals`         | number  | `3`                                    | decimal places in Grid mode                                                                        |
| `q-discovery-server.cfg.refreshInterval`    | number  | `30`                                   | discovery server refresh interval (minutes)                                                        |
| `q-terminal.cfg.qBinary`                    | string  | `q`                                    | q executable name or full path                                                                     |
| `q-terminal.cfg.envPath`                    | string  | `''`                                   | environment file (relative or absolute path)                                                       |
| `q-process-explorer.cfg.prevQueryLimit`     | number  | `5`                                    | preview query limit in Process Explorer                                                            |
| `q-process-explorer.cfg.autoRefresh`        | boolean | `false`                                | auto-refresh Process Explorer                                                                      |
| `q-process-explorer.cfg.excludedNamespaces` | array   | `["q","Q","h","j","o","s"]`            | namespaces excluded from Process Explorer                                                          |
| `q-output.cfg.autoClear`                    | boolean | `false`                                | clear output before each query                                                                     |
| `q-output.cfg.ignoreNullReturn`             | boolean | `false`                                | suppress null returns in non-Console modes                                                         |
| `q-output.cfg.includeQuery`                 | boolean | `false`                                | include the query text in output                                                                   |
| `q-output.cfg.consoleSize`                  | string  | `'50 160'`                             | console size for table output                                                                      |
| `q-kuki.kukiRoot`                           | string  | `''`                                   | path to kuki root for additional built-in function analysis (defaults to `~/kuki` or `$KUKI_PATH`) |

Process lists can be imported and exported via `kest.json` ([schema](schemas/kest.json)). kuki configuration uses `kuki.json` ([schema](schemas/kuki.json)).

## Language server

The offline language server analyzes q and k files matched by `q-lang-server.sourceFiles.includeGlob`. To improve parsing accuracy, add `;` to mark the end of a statement when needed.

### Installation

The extension starts the `qls` binary from your `PATH` — without it, the linter, formatter, and navigation features are unavailable. Install it from [PyPI](https://pypi.org/project/q-lang-server/):

```bash
pip install q-lang-server
# or
uv tool install q-lang-server
```

Then reload the window (`Developer: Reload Window`). The same binary works with any LSP client (for example [chili-neovim](https://github.com/jshinonome/chili-neovim)).

### Linter and formatter directives

- `// q-lang-server-ignore-linter` — ignore linter for the following block
- `// q-lang-server-ignore-formatter` — ignore formatter for the following block

## q Notebook

Files with the `.qnb` extension use the notebook feature. Output format follows the active query mode:

| Query mode    | Notebook output  |
| ------------- | ---------------- |
| Console       | notebook console |
| Grid          | notebook HTML    |
| Visualization | notebook HTML    |

Per-cell directives can override the global query mode: `// @console`, `// @grid`, `// @chart <type>`.

### Charts

In Grid or Visualization mode, add a chart directive as the first comment in a cell and execute:

```
// @chart lines
([] date: .z.D + til 10; price: 100?1.0)
```

Supported chart types: `lines`, `bar`, `scatter`, `histogram`, `heatmap`.

Optional directives (one per line, after the chart type):

| Directive  | Example              | Description                                |
| ---------- | -------------------- | ------------------------------------------ |
| `@height`  | `// @height 400`     | chart height in pixels (default 600)       |
| `@width`   | `// @width 900`      | chart width in pixels (default 800)        |
| `@title`   | `// @title my_chart` | chart title                                |
| `@barmode` | `// @barmode stack`  | bar/histogram mode: `group`, `stack`, etc. |

Limitations:

- the first non-numeric column is used as the label
- up to 9 series in line, bar, and histogram charts
- up to 4 series pairs in scatter charts

See [examples/chart.qnb](examples/chart.qnb) for full examples.

## Panels

Open the **q Professional** activity bar to access these views.

### Processes

Lists configured processes; click to switch the active connection. Processes are grouped into a tree by tags.

Tag colors:

- green — `dev`, `development`
- blue — `uat`
- red — `prd`, `prod`

Use **Import Processes** / **Export Processes** to share process lists via `kest.json`.

### Discovery Server

Configure a REST API endpoint that returns a list of `{host: string, port: number, label: string}`. Discovered processes appear in the Processes panel but are not saved to disk.

### Process Explorer

Lists variables defined on the active kdb+ process. Use **Preview** to run a short query against a variable (limited by `prevQueryLimit`).

### Query History

Records executed queries. Use **Rerun Query History** to repeat a past query.

## Query modes

Run **Switch Query Mode** from the Command Palette to cycle modes, or set `q-processes.cfg.queryMode` in settings.

### Visualization

Powered by [perspective](https://perspective.finos.org/). Tables are shown in a webview; other result types still appear in the output channel. Table queries are limited to 10,000 rows by default. Click the **flame** icon in the Processes panel, or run **Toggle Unlimited Query**, to remove the limit. Note that Visualization supports millisecond timestamp precision only.

### Grid

Powered by [ag-grid-community](https://www.ag-grid.com/) and [plotly](https://plotly.com/javascript/). Tables are shown in a webview; other result types still appear in the output channel. Table queries are limited to 10,000 rows by default — use the **flame** icon or **Toggle Unlimited Query** to remove the limit. Grid supports nanosecond timestamp precision.

### Console (default)

Writes results to an output channel. Set **Console Size for Output** (`q-output.cfg.consoleSize`) to control table formatting. For non-table output, use `system "c rows columns"` in q.

## Commands

All commands are under the **q-pro** category in the Command Palette (<kbd>ctrl</kbd>+<kbd>shift</kbd>+<kbd>p</kbd>).

| Command                              | Description                                      |
| ------------------------------------ | ------------------------------------------------ |
| Connect to Process                   | connect to the selected process                  |
| Disconnect to Process                | disconnect from the active process               |
| Switch Query Mode                    | cycle Console → Grid → Visualization             |
| Toggle Unlimited Query               | remove the 10,000-row table limit                |
| Abort Current Query                  | stop the running query                           |
| Add / Edit / Delete Process          | manage process entries                           |
| Import / Export Processes            | load or save `kest.json`                         |
| Tag Process                          | assign tags to a process                         |
| Refresh Processes                    | reload the process list                          |
| Add / Edit / Delete Discovery Server | manage discovery endpoints                       |
| Reload Discovery Server              | refresh discovered processes                     |
| Refresh Process Explorer             | reload variables from the active process         |
| Toggle Auto Refresh                  | enable periodic Process Explorer refresh         |
| Preview                              | run a preview query on a Process Explorer item   |
| Insert Active Connection Label       | insert the active connection label at the cursor |
| Export Notebook                      | export the current q notebook                    |
| Run Code from Terminal               | execute code from an integrated terminal         |
| Settings                             | open q-pro settings                              |
| Rerun Query History                  | repeat a query from history                      |

## Shortcuts

Default keybindings (when editing q files):

| Shortcut                                      | Action                        |
| --------------------------------------------- | ----------------------------- |
| <kbd>ctrl</kbd>+<kbd>q</kbd>                  | query current line            |
| <kbd>ctrl</kbd>+<kbd>r</kbd>                  | query selection               |
| <kbd>ctrl</kbd>+<kbd>e</kbd>                  | query block                   |
| <kbd>ctrl</kbd>+<kbd>shift</kbd>+<kbd>q</kbd> | send current line to terminal |
| <kbd>ctrl</kbd>+<kbd>shift</kbd>+<kbd>r</kbd> | send selection to terminal    |
| <kbd>ctrl</kbd>+<kbd>shift</kbd>+<kbd>e</kbd> | send block to terminal        |

To customize shortcuts:

1. <kbd>ctrl</kbd>+<kbd>shift</kbd>+<kbd>p</kbd> → **Preferences: Open Keyboard Shortcuts**
2. Search for `q-pro`

## Tips

### Enable auto-scrolling for the output channel

1. <kbd>ctrl</kbd>+<kbd>,</kbd> → disable **Output › Smart Scroll**.
2. Click the lock icon at the top-right of the output channel to enable auto-scrolling.

### Disable word wrap in q Console output

Command Palette → **Preferences: Open User Settings (JSON)**, then add:

```json
"[q-console]": {
    "editor.wordWrap": "off"
}
```

### Highlight ATTENTION and TODO comments

Command Palette → **Preferences: Open User Settings (JSON)**, then add:

```json
"editor.tokenColorCustomizations": {
    "textMateRules": [
        {
            "scope": "comment.line.attention",
            "settings": {
                "fontStyle": "italic",
                "foreground": "#B71C1C"
            }
        },
        {
            "scope": "comment.line.todo",
            "settings": {
                "fontStyle": "italic",
                "foreground": "#2E7D32"
            }
        }
    ]
}
```

### Special connection comment

Evaluating a comment line like `/<=> quant,prod,local-1800` connects to the process labeled `quant,prod,local-1800`. Use **Insert Active Connection Label** to insert the label of the currently active connection.
