/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { FunctionComponent } from 'preact';
import { QueryResult } from '../client/models/query-result';
import { formatKTable } from '../client/util/format';
// import './style.css';

const darkColor={
    'info':'#5E35B1',
    'error':'#B71C1C',
};

const lightColor = {
    'info':'#EDE7F6',
    'error':'#FFEBEE',
};

export const QNotebookCell: FunctionComponent<{ queryResult: Readonly<QueryResult> }> = ({ queryResult }) => {
    const darkMode = document.body.getAttribute('data-vscode-theme-kind')?.includes('dark') ?? false;
    const color = darkMode ? darkColor:lightColor;
    let keys, columns:string[];
    switch (queryResult.type) {
        case 'text':
            return <CodeCell color={color.info} text={queryResult.data.join('\n')}></CodeCell>;
        case 'error':
            return <CodeCell color={color.error} text={queryResult.data.join('\n')}></CodeCell>;
        case 'json':
            queryResult = formatKTable(queryResult);
            columns = queryResult.meta?queryResult.meta.c:[];
            keys = queryResult.keys?queryResult.keys:[];
            return <Table data={queryResult.data} columns={columns} keys={keys} color={color.info}></Table>;
        default:
            return <CodeCell color={color.error} text={'unsupported query result type - '+queryResult.type}></CodeCell>;
    }
};

const CodeCell: FunctionComponent<{ color: Readonly<string>, text: string }> = ({ color, text }) => {
    return <div style={'max-height: 50em;'}><pre style={'padding: 5px;border-left: 5px solid '+color}>
        <code class="vscode-code-block" data-vscode-code-block-lang="q"><div class="monaco-tokenized-source">{text}</div></code>
    </pre></div>;
};

function Table(props:{ data:any, columns:string[], keys:string[], color:string }) {
    const data = props.data;
    const columns = props.columns;
    return <div style={'max-height: 50em;'}><table>
        <thead style={'padding: 5px;border-left: 5px solid '+props.color}>
            <tr>
                { columns.map(col=>(<td>{col}</td>)) }
            </tr>
        </thead>
        <tbody style={'padding: 5px;border-left: 5px solid '+props.color}>
            { data[columns[0]].map((_: any, i: number)=>{
                return <tr>
                    { columns.map(col=>(<td>{data[col][i]}</td>)) }
                </tr>;
            })}
        </tbody>
    </table></div>;
}
