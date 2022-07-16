// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { FunctionComponent, h } from 'preact';
import { QueryResult } from './query-result';
import './style.css';

const darkColor={
    'text':'#5E35B1',
    'error':'#B71C1C',
};

const lightColor = {
    'text':'#EDE7F6',
    'error':'#FFEBEE',
};

export const QNotebookCell: FunctionComponent<{ queryResult: Readonly<QueryResult> }> = ({ queryResult }) => {

    const darkMode = document.body.getAttribute('data-vscode-theme-kind')?.includes('dark') ?? false;

    const color = darkMode ? darkColor:lightColor;

    switch (queryResult.type) {
        case 'text':
            return <CodeCell color={color.text} text={queryResult.data.join('\n')}></CodeCell>;
        case 'error':
            return <CodeCell color={color.error} text={queryResult.data.join('\n')}></CodeCell>;
        case 'json':
            return <table></table>;
        default:
            return <CodeCell color={color.error} text={'unsupported query result type - '+queryResult.type}></CodeCell>;
    }
};

export const CodeCell: FunctionComponent<{ color: Readonly<string>, text: string }> = ({ color, text }) => {
    return <div style={'max-height: 50em;'}><pre style={'padding: 5px;border-left: 5px solid '+color}>
        <code class="vscode-code-block" data-vscode-code-block-lang="q"><div class="monaco-tokenized-source">{text}</div></code>
    </pre></div>;
};
