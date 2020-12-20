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
        client: './src/client/q-ext.ts',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'q-ext.js',
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
        server: './src/server/start-server.ts',
    },

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'q-ser.js',
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