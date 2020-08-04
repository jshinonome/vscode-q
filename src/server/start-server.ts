/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { createConnection, IConnection, InitializeParams, InitializeResult, ProposedFeatures } from 'vscode-languageserver';
import QLangServer from './q-lang-server';

const connection: IConnection = createConnection(ProposedFeatures.all);

connection.onInitialize(
    async (params: InitializeParams): Promise<InitializeResult> => {
        const server = await QLangServer.initialize(connection, params);
        return {
            capabilities: server.capabilities(),
        };
    },
);

connection.listen();
