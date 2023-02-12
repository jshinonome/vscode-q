#!/bin/bash

# copy perspective package files
jsDir=assets/query-view/js
cssDir=assets/query-view/css
cp node_modules/@finos/perspective/dist/umd/perspective.js $jsDir
cp node_modules/@finos/perspective-viewer/dist/umd/material*css $cssDir
cp node_modules/@finos/perspective-viewer/dist/umd/perspective-viewer.js $jsDir
cp node_modules/@finos/perspective-viewer-d3fc/dist/umd/perspective-viewer-d3fc.js $jsDir
cp node_modules/@finos/perspective-viewer-datagrid/dist/umd/perspective-viewer-datagrid.js $jsDir
cp node_modules/dayjs/dayjs.min.js $jsDir
cp node_modules/dayjs/plugin/utc.js $jsDir/plugin

# update js for view
cp node_modules/ag-grid-community/dist/ag-grid-community.min.js assets/view/js/
cp node_modules/chart.js/dist/chart.umd.js assets/view/js

# update spectre
cp node_modules/spectre.css/dist/spectre.min.css assets/view/css/