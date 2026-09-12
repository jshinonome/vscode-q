## 5.0.3

### Features

- grid: click a cell to copy its displayed text (with a toast confirmation)
- grid: detail popup can drill into nested tables (column-oriented `{col: values}` objects render as real tables), in addition to dicts and lists
- grid: detail popup pages large values (2000 rows per page) and truncates cell previews with a character budget, so huge nested values never freeze the view; long strings become drillable to see the full text
- grid: `Open in Grid` button in the detail popup opens the drilled table/list in its own independent grid panel with sorting, filtering, and CSV export
- unwrapped query: raw list results now fit grid/visualization mode — a list of dicts becomes a table, other lists a single `value` column; dictionary values stay raw so nested lists/tables are drillable
- process view: add a copy button on each process that copies its `tags,label` for use as the agent query label
- agent integration: query results are returned as a JSON object — tables as `{columns, rowCount, data}` (data is an array of row arrays, no row cap), text as `{output}`, failures as `{error}`
- q lang server: clear error message with install instructions when the `qls` binary is not found; README documents the required install

### Bug Fixes

- q lang server: an inline comment is no longer moved to its own line — neither after a top-level `;` nor inside a multi-line function body

## 5.0.2

### Features

- grid: add pin button to keep current grid as a snapshot; the next query opens a new grid for comparison
- process explorer: double-click a table/list/dict to query its full value, plus an inline query button next to preview
- q lang server: wrap long symbol lists over 100 chars with `,` continuation lines (skipped inside q-sql phases, where `,` would change semantics)
- add `q-processes.cfg.disableQueryWrapper` configuration, `Toggle Unwrapped Query` command and process view button to send queries as-is without the query wrapper
- agent integration: add `q-pro_runQuery` language model tool (`#qQuery`) so copilot agent mode can query q processes, and `q-processes.executeQuery` command for programmatic access by any extension/agent

### Bug Fixes

- process config: enable TLS checkbox was not clickable
- windows: tree view icons (process explorer etc.) did not show up — icon paths were built with `Uri.parse` instead of `Uri.file`
- grid: show `true`/`false` text for boolean columns instead of a checkbox
- grid: double-click a nested/long value to open a popup detail view (dict as key/value table, list as indexed table, string as text) with a close button, instead of `[object Object]` in a text editor
- q lang server: formatting a comma-split symbol list was not idempotent — output kept changing on repeated formats
- q lang server: only wrap a symbol list when it is the rightmost term of its expression — wrapping before a trailing operator (e.g. `` `a`b`c!til 3 ``, `xasc`, `except`) inserted a `,` that changed program semantics
- q lang server: formatting edits now use UTF-16 character offsets as LSP requires — edits on lines containing non-ASCII text landed at shifted positions
- q lang server: an editor tab size of 0 produced column-0 continuation lines that split statements — fall back to 2

## 5.0.0

### Features

- migrate grid, visualization, and chart views to webpack-bundled Preact/ESM components
- remove `assets/view` dependency — all view logic now in `src/webview/*.tsx`
- add key column header coloring in grid view
- apply q-console grammar to output channel

### Bug Fixes

- fix process tree icon not updating on connection change
- fix Perspective `timestamp` type mapping (use `datetime`)
- fix q-console tmLanguage scopeName mismatch

## 3.4.1

### Changes

- q lang server: reduce range of unexpected error

## 3.3.3

### Feature

- q lang server
  - // q-lang-server-ignore-linter: ignore linter for the following block of code
  - // q-lang-server-ignore-formatter: ignore formatter for the following block of code

## 3.3.2

### Feature

- q notebook: allow @chart/grid/console to overwrite query mode

## 3.3.0

### Features

- q notebook: add chart in grid/Visualization mode

### Bug Fixes

- q notebook: allow null return
- grid: enable click to download chart

## 3.2.1

### Bug Fixes

- q lang server: reanalyze active editor's document

## 3.2.0

### Bug Fixes

- q lang server: not insert semicolon for system command

### Changes

- q lang server: better error message for missing "from"

## 3.1.9

### Changes

- q lang server: remove function name from signature help

## 3.1.8

### Features

- q lang server: add .Q.fpn

### Changes

- add process: async preload source code

## 3.1.7

### Bug Fixes

- q lang server
  - fix a format bug
  - analyze kuki q source codes

## 3.1.6

### Bug Fixes

- q lang server: add q-pro-ignore to skip formatting

## 3.1.5

### Changes

- insert comment line if over 80 chars
- comment uses two slashes

## 3.1.4

### Bug Fixes

- formatter: stop formatting undefine

## 3.1.3

### Bug Fixes

- formatter: stop inserting space before "-" when it is adjacent to the previous expression
- notebook: ignore last semicolon

## 3.1.2

### Bug Fixes

- lint: projection null

## 3.1.1

### Changes

- formatter: add more spaces

## 3.1.0

### Bug Fixes

- lint
  - allow k operator in list
  - remove diagnostics when close file

## 3.0.7

### Bug Fixes

- language server: signature help

- formatter: indent

- lint
  - detect length mismatch for dictionaries
  - support functional update

## 3.0.5

### Features

- lint
  - detect length mismatch for dictionaries
  - support functional update

## 3.0.4

### Features

- lint: detect no reachable code

## 3.0.2

### Bug Fixes

- formatter: skip ERROR, handle generic list newline
- lint: show ERROR, check usage in table assignments

## 3.0.1

### Bug Fixes

- formatter:
  - format list, dictionary, table
  - cut line more accurate

## 3.0.0

### Features

- formatter
- lint
- add process: migrate to vscode ui, add a preload configuration
- add discovery server: migrate to vscode ui
- q notebook: reduce table output rows
- syntax: allow name.method

## 2.0.8

### Bug Fixes

- jkdb: ack sync message, skip async message

## 2.0.7

### Features

- update dependencies

## 2.0.6

### Features

- support additional kuki built in functions

## 2.0.5

### Features

- support kuki built in functions

## 2.0.4

### Features

- language server: go to imported file

## 2.0.3

### Features

- grid: add histogram, heatmap

## 2.0.0

### Features

- support kuki

## 1.1.9

### Bug Fixes

- language server: not recognize start of line

## 1.1.8

### Bug Fixes

- language server: rewrite call hierarchy logic

## 1.1.7

### Bug Fixes

- language server: detect inline comment after a newline

## 1.1.6

### Bug Fixes

- run code from terminal

## 1.1.5

### Bug Fixes

- fix negative time highlight

## 1.1.4

### Bug Fixes

- fail to start language server

## 1.1.3

### Bug Fixes

- fail to enable TLS

## 1.1.2

### Features

- q syntax: support multiple lines string
- discovery server: icon and require authentication option

## 1.1.1

### Bug Fixes

- q notebook: text output duplicates

## 1.1.0

### Features

- grid: enable pop up for long text column
- grid: support lambda and projection

## 1.0.8

### Features

- discovery server: retain connections and remove processes
- discovery server: auto refresh discovery server
- discovery server: auto disconnect prod discovery server

## 1.0.6

### Bug Fixes

- upgrade jkdb to return _LOST_CONNECTION_ error if lost connection while querying

## 1.0.2

### Features

- q-pro config: q-output.cfg.ignoreNullReturn, Ignore Null Return When Using Non-Console Mode

## 1.0.0

### pre-release
