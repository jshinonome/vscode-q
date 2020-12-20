/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { Connection, createConnection, InitializeParams, InitializeResult, ProposedFeatures } from 'vscode-languageserver/node';
import QLangServer from './q-lang-server';

const connection: Connection = createConnection(ProposedFeatures.all);

console.log('start server');
connection.onInitialize(
    async (params: InitializeParams): Promise<InitializeResult> => {
        const server = await QLangServer.initialize(connection, params);
        return {
            capabilities: server.capabilities(),
        };
    },
);

connection.listen();
