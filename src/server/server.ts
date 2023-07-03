import { Connection, createConnection, InitializeParams, InitializeResult, ProposedFeatures } from 'vscode-languageserver/node';
import LangServer from './lang-server';

const connection: Connection = createConnection(ProposedFeatures.all);

connection.onInitialize(
    async (params: InitializeParams): Promise<InitializeResult> => {
        const server = await LangServer.initialize(connection, params);
        return {
            capabilities: server.capabilities(),
        };
    },
);

connection.listen();
