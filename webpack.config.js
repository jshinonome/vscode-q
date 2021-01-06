//@ts-check

'use strict';

const path = require('path');

const clientConf = {
    target: 'node',

    node: {
        __dirname: false,
        __filename: false,
    },

    entry: {
        client: './src/client/client.ts',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'client.js',
        libraryTarget: 'commonjs2',
    },
    devtool: 'source-map',
    externals: {
        vscode: 'commonjs vscode'
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            compilerOptions: {
                                'sourceMap': true,
                            }
                        }
                    }
                ]
            }
        ]
    },
};

const serverConf = {
    target: 'node',

    node: {
        __dirname: false,
        __filename: false,
    },

    entry: {
        server: './src/server/server.ts',
    },

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'server.js',
        libraryTarget: 'commonjs2',
    },

    devtool: 'source-map',
    externals: {
        vscode: 'commonjs vscode'
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            compilerOptions: {
                                'sourceMap': true,
                            }
                        }
                    }
                ]
            }
        ]
    }
};

module.exports = [clientConf, serverConf];