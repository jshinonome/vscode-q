/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent } from 'preact';
import { QueryResult } from '../client/models/query-result';
import { formatKTable } from '../client/util/format';
import { kTypeName } from '../client/util/k-map';
import './style.css';

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
    let keys, columns, kType:string[];
    switch (queryResult.type) {
        case 'text':
            return <CodeCell color={color.info} text={queryResult.data.join('\n')}></CodeCell>;
        case 'error':
            return <CodeCell color={color.error} text={queryResult.data.join('\n')}></CodeCell>;
        case 'json':
            queryResult = formatKTable(queryResult);
            if(queryResult.meta){
                const meta = queryResult.meta;
                columns = meta.c;
                kType = meta.t.split('').map(t=>kTypeName.get(t)??'');
                keys = queryResult.keys?queryResult.keys:[];
                return <Table data={queryResult.data} columns={columns} kType={kType} keys={keys}></Table>;
            }
            return <CodeCell color={color.error} text='failed to generate a html table'></CodeCell>;
        default:
            return <CodeCell color={color.error} text={'unsupported query result type - '+queryResult.type}></CodeCell>;
    }
};

const CodeCell: FunctionComponent<{ color: Readonly<string>, text: string }> = ({ color, text }) => {
    return <div style={'max-height:50em;overflow:auto'}><pre style={'padding:5px;border-left:5px solid '+color}>
        <code class="vscode-code-block" data-vscode-code-block-lang="q"><div class="monaco-tokenized-source">{text}</div></code>
    </pre></div>;
};

function Table(props:{ data:any, columns:string[], kType:string[], keys:string[] }) {
    const data = props.data;
    const columns = props.columns;
    const kType = props.kType;
    return <div>
        <div style={'max-height:50em;overflow:auto'}>
            <table>
                <thead>
                    <tr style='position:sticky;top:0;background:var(--vscode-badge-background);'>
                        { columns.map(col=>(<th>{col}</th>)) }
                    </tr>
                    <tr>
                        { kType.map(t=>(<td>{t}</td>)) }
                    </tr>
                </thead>
                <tbody>
                    { data[columns[0]].map((_: any, i: number)=>{
                        return <tr >
                            { columns.map((col, j)=>
                                (<td style={['char','symbol','','chars'].includes(kType[j])?'text-align:left':''}>
                                    {data[col][i]}</td>)) }
                        </tr>;
                    })}
                </tbody>
            </table>
        </div>
        <div style={'font-size:80%;opacity:0.71;padding:5px'}><b>{`${data[columns[0]].length} rows × ${columns.length} columns`}</b></div>
    </div>;
}
