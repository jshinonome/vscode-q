//@ts-check

'use strict';

const path = require('path');

const conf = {
    node: {
        __dirname: false,
        __filename: false,
    },

    devtool: 'source-map',

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
                                sourceMap: true,
                            },
                        },
                    },
                ],
            },
        ],
    },
}


const clientConf = {
    ...conf,
    target: 'node',
    entry: {
        client: './src/client/client.ts',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'client.js',
        libraryTarget: 'commonjs2',
    },
    externals: {
        vscode: 'commonjs vscode',
        'node:path': 'path',
        'node:os': 'os',
        'node:process': 'process',
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
};

const serverConf = {
    ...conf,
    target: 'node',
    entry: {
        server: './src/server/server.ts',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'server.js',
        libraryTarget: 'commonjs2',
    },
    externals: {
        vscode: 'commonjs vscode',
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
};

const qConsoleRendererConf = {
    ...conf,
    entry: './src/renderer/index.tsx',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'renderer.js',
        libraryTarget: 'module',
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.css', '.js', '.jsx']
    },
    experiments: {
        outputModule: true,
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                loader: 'ts-loader',
                options: {
                    configFile: 'src/renderer/tsconfig.json',
                    transpileOnly: true,
                },
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            esModule: false,
                            importLoaders: 1,
                            modules: true,
                        },
                    },
                ],
            },
        ],
    }
}

module.exports = [clientConf, serverConf, qConsoleRendererConf];
