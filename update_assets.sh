#!/bin/bash

# update packages
npm update
# copy perspective package files
jsDir=assets/qview/js
cssDir=assets/qview/css
cp node_modules/@finos/perspective/dist/umd/perspective.inline* $jsDir
cp node_modules/@finos/perspective-viewer/dist/umd/material* $cssDir
cp node_modules/@finos/perspective-viewer/dist/umd/perspective-viewer* $jssDir
cp node_modules/@finos/perspective-viewer-d3fc/dist/umd/perspective-viewer-d3fc.js $jsDir
cp node_modules/@finos/perspective-viewer-highcharts/dist/umd/perspective-viewer-highcharts.js $jsDir
cp node_modules/@finos/perspective-viewer-hypergrid/dist/umd/perspective-viewer-hypergrid.js $jsDir
