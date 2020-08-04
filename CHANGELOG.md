# change log
all notable changes to the "vscode-q" extension will be documented in this file.

## 1.6.3
### added
- add signature help

## 1.6.2
### added
- parse namespace(rename won't work)

## 1.6.0
### added
- virtualization!!!
- configuration

### changed
- default mode: query view

## 1.5.3
### added
- rename symbols

## 1.5.2
### added
- query status bar, block query if busy
- better recognize definition with less semicolons

### removed
- auto insert semicolon ';'

## 1.5.1
### added
- completion for symbols

## 1.5.0
### added
- go to definition
- go to reference
- workspace symbol
- document highlight
- document symbol
- completion(include all global namespace variables in src folder)
- completion resolve

### changed
- set default conn label
- change minor issues with semantic parameter highlight

## 1.4.0
### added
- fix issue when query kdb+ version < 3.5, earlier version doesn't have .q.trp yet
- add q language server, hope to add code jump soon.
- auto insert semicolon ';'

## 1.3.2
### added
- semantic parameter highlight

## 1.3.1
### added
- show warning for lost connection
- highlight @p, @r in comments
- auto append space to close brackets at beginning of line

## 1.3.0
- add q query console(default)

## 1.2.0
### added
- add q server manager
- add query view

## 1.1.0
### added
- automatically add space to start braces on enter

## 1.0.3
### added
- snippets for .q.dpft(s), .q.en(s), select, update

### changed
- move '::' to keyword

## 1.0.0
### added
- initial release