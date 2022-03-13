# change log

## 2.5.1

### added

-   add server: TLS option

## 2.5.0

### added

-   server explorer: query buttons

## 2.4.8

### added

-   query view: rows count in the webview

### removed

-   query grid|visualization: q console output for rows count

## 2.4.7

### added

-   chart view: base64 PNG chart for the result has the output key and bytes in the output key

## 2.4.6

### fixed

-   server explorer: fail to load variables because of .Q.pt

### changed

-   q-server-cfg.json: use [env-paths](https://www.npmjs.com/package/env-paths)

## 2.4.5

### added

-   command: separator for connecting to a q process
-   server explorer: abort button

### changed

-   command: limit query commands to q files

## 2.4.4

### changed

-   server explorer: use a different icon for partitioned tables

## 2.4.2

-   comment: run comment start with `/<=> process` will connect to the process

## 2.4.1

### fixed

-   server explorer: only load columns info for table and skip loading partitioned table preview

## 2.4.0

-   query view: use plugin for formatting k temporal type

## 2.3.9

### added

-   server list: show socket for quick pickup
-   server explorer: configure to exclude namespaces

## 2.3.7

### fixed

-   query view: fix an overwrite issue
-   query grid: fix an overwrite issue

## 2.3.6

### added

-   commend: query current block
-   commend: send current block to terminal
-   shortcut: query current block (ctrl+e)
-   shortcut: send current block to terminal (ctrl+shift+e)

## 2.3.4

### added

-   server explorer: auto refresh configuration and button

## 2.3.1

### added

-   lang server: hover for server variables

## 2.2.7

### changed

-   add server: use customized authentication, depends on `jshinonome.vscode-q-auth`

## 2.2.6

### changed

-   server explorer: list namespace variables only

## 2.2.1

### added

-   query console: option to show query
-   query console: option for console size

## 2.1.9

### added

-   lang server: analyze \l file(full path)

## 2.1.8

### added

-   query view: keep configuration if same columns(schema)
-   query grid: update title / y-axes on input

### fixed

-   query view: daylight saving change issue
-   q syntaxes: semantic highlight for default parameters

## 2.1.7

### added

-   query view: load content after webview is loaded
-   query grid: load content after webview is loaded
-   add server: load content after webview is loaded

### fixed

-   query view: timezone offset(connect to a different timezone remote server)

## 2.1.6

### fixed

-   query grid: fix daylight saving change issue

## 2.1.5

### fixed

-   add server view: hostname

all notable changes to the "vscode-q" extension will be documented in this file.

## 2.1.4

### added

-   add server view
-   q syntaxes: inline attention/todo

## 2.1.3

### changed

-   status bar: separate query mode and connection, click to change query mode

### fixed

-   q syntaxes: keyword after underscore(\_keyword)

### added

-   query grid: show dictionary
-   query view: show dictionary

## 2.1.2

### fixed

-   query view: enable edit(copy)
-   query view: set max width

## 2.1.1

### fixed

-   q syntaxes: fix '\_' in a variable name

## 2.1.0

### added

-   q syntaxes: include '\_' as an operator

### fixed

-   lang server: fix to detect inline comment in function

### changed

-   query-view: remove moment dependency

## 2.0.9

### added

-   q language server: call hierarchy

## 2.0.8

### added

-   attention and todo tokens for comment, see tips in readme to add colors

### fixed

-   query view/grid: round temporal types in c.js to show more accurate datetime

## 2.0.7

### added

-   server explorer: show table schema

### changed

-   query grid: timestamp and timespan only show milliseconds, because javascript cannot show nanoseconds correctly

## 2.0.6

### added

-   lang server: build in functions signatures

## 2.0.5

### added

-   query grid: polling

### changed

-   query grid: allow text selection

## 2.0.4

### changed

-   query grid: layout of configuration
-   query grid: column order
-   query grid: remove x axes label for scatter

### fixed

-   query grid: char column

## 2.0.3

### added

-   query grid: scatter

### fixed

-   query grid: float null

## 2.0.2

### added

-   auto clear output configuration

### fixed

-   query grid: char column

## 2.0.1

### added

-   query grid: save chart as png
-   query grid: save data as csv

## 2.0.0

### added

-   query grid: chart

## 1.9.10

### added

-   trigger to pick q process if no active q process
-   auto-completion for local identifier defined in function

### fixed

-   disable parameter semantic token for reserved words

## 1.9.9

### added

-   history view
    -   rerun history
    -   icon to indicate query was success or failed
-   connect q server

## 1.9.8

### added

-   history view

## 1.9.7

### changed

-   semantic tokens are provided by language server

## 1.9.5

### fixed

-   cannot remove server from server list
-   query start with '`' was treated as a symbol

## 1.9.4

### fixed

-   fix 24:mm:ss to 00:mm:ss

## 1.9.3

### added

-   env file path configuration for running q file
-   color key columns in Qurey View and Query Grid
-   update data/time format for Query View to match q format

### changed

-   migrate grid in Query View to use Datagrid

### fixed

-   Query View an Query Grid can load data properly for 1st query

## 1.9.2

### added

-   error explanation

## 1.9.1

### added

-   parse projection

## 1.9.0

### added

-   query grid

## 1.8.7

### added

-   enable q syntax for q Console of Output

## 1.8.5

### changed

-   use tags+label as unique server id

## 1.8.4

### added

-   query view: support time, minute, second
-   offset timezone at node-q (treat temporal type in kdb+ as local time)

### removed

-   query view: set timezone to UTC (cannot set timezone for graph label)

## 1.8.3

### added

-   query view: set timezone to UTC
-   query view: set 7 decimal digits

## 1.8.2

### added

-   'Preview' for tables
-   parameters to autocomplete

## 1.8.0

-   'Run q File in Terminal'
-   send source to current terminal

## 1.7.6

### changed

-   enhance semantic to support highlight any `@[tag] [parameter name] [type]`

## 1.7.5

### changed

-   Query View uses same theme kind as vscode theme kind(light/dark)
-   enable to set extension configuration for each workspace

## 1.7.4

### added

-   add tags(folders) for server list
-   monitor q file changes

## 1.7.3

### changed

-   enable to start from directory contains no permission file/sub-directory

## 1.7.2

### added

-   support autocomplete for column names
-   enable timeout(server configuration) on kdb+ process

## 1.7.0

### added

-   support autocomplete for server variables
-   support signature help for server functions(only for type 100:lambda)

## 1.6.9

### added

-   append data type to query view

## 1.6.3

### added

-   add signature help

## 1.6.2

### added

-   parse namespace(rename won't work)

## 1.6.0

### added

-   visualization!!!
-   configuration

### changed

-   default mode: query view

## 1.5.3

### added

-   rename symbols

## 1.5.2

### added

-   query status bar, block query if busy
-   better recognize definition with less semicolons

### removed

-   auto insert semicolon ';'

## 1.5.1

### added

-   completion for symbols

## 1.5.0

### added

-   q language server: go to definition
-   q language server: go to reference
-   q language server: workspace symbol
-   q language server: document highlight
-   q language server: document symbol
-   q language server: completion(include all global namespace variables in src folder)
-   q language server: completion resolve

### changed

-   set default conn label
-   change minor issues with semantic parameter highlight

## 1.4.0

### added

-   fix issue when query kdb+ version < 3.5, earlier version doesn't have .q.trp yet
-   add q language server
-   formatter: auto insert semicolon ';'

## 1.3.2

### added

-   semantic parameter highlight

## 1.3.1

### added

-   show warning for lost connection
-   q syntaxes: highlight @p, @r in comments
-   auto append space to close brackets at beginning of line

## 1.3.0

-   add q query console(default)

## 1.2.0

### added

-   add q server manager
-   add query view

## 1.1.0

### added

-   formatter: automatically add space to start braces on enter

## 1.0.3

### added

-   snippets: .q.dpft(s), .q.en(s), select, update

### changed

-   q syntaxes: move '::' to keyword

## 1.0.0

### added

-   initial release
