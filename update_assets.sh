#!/bin/bash

# update packages
npm update
# copy perspective package files
jsDir=assets/qview/js
cssDir=assets/qview/css
cp node_modules/@finos/perspective/dist/umd/perspective.inline* $jsDir
cp node_modules/@finos/perspective-viewer/dist/umd/material*css $cssDir
cp node_modules/@finos/perspective-viewer/dist/umd/perspective-viewer* $jssDir
cp node_modules/@finos/perspective-viewer-d3fc/dist/umd/perspective-viewer-d3fc.js $jsDir
cp node_modules/@finos/perspective-viewer-datagrid/dist/umd/perspective-viewer-datagrid.js $jsDir

# update js for query-grid
cp node_modules/ag-grid-community/dist/ag-grid-community.min.js assets/query-grid/js/
cp node_modules/ag-grid-community/dist/styles/ag-grid.min.css assets/query-grid/css/
cp node_modules/ag-grid-community/dist/styles/ag-theme-balham*min.css assets/query-grid/css/
cp node_modules/chart.js/dist/Chart.min.css assets/query-grid/css
cp node_modules/chart.js/dist/Chart.min.js assets/query-grid/js