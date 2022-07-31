/* eslint-disable @typescript-eslint/no-explicit-any */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { QueryResult } from '../models/query-result';
dayjs.extend(utc);

type formatter = (value: any) => any;
const significantDigits = 7;

const kTypeMap = new Map<string, formatter>([
    ['b', (value) => value ? '1b' : '0b'],
    ['x', (value) => '0x' + value],
    ['h', (value) => value + 'h'],
    ['e', (value: number) => value ? value.toPrecision(significantDigits) : value],
    ['f', (value: number) => value ? value.toPrecision(significantDigits) : value],
    // Nanoseconds is not native supported in javascript
    ['p', (value) => dayjs.utc(value).format('YYYY.MM.DD[D]HH:mm:ss.SSS')],
    ['m', (value) => dayjs.utc(value).format('YYYY.MMm')],
    ['d', (value) => dayjs.utc(value).format('YYYY.MM.DD')],
    ['z', (value) => dayjs.utc(value).format('YYYY.MM.DD[D]HH:mm:ss.SSS')],
    ['n', (value) => dayjs.utc(value).format('HH:mm:ss.SSS')],
    ['u', (value) => dayjs.utc(value).format('HH:mm')],
    ['v', (value) => dayjs.utc(value).format('HH:mm:ss')],
    ['t', (value) => dayjs.utc(value).format('HH:mm:ss.SSS')],
    [' ', (value) => JSON.stringify(value)]
]);

function formatKTable(result: QueryResult): QueryResult {
    if (result.meta) {
        const meta = result.meta;
        const formatterMap = meta.c.reduce((o: any, k: any, i: number) => (
            {
                ...o, [k]: kTypeMap.get(meta.t[i]) ?? ((value) => value)
            }), {}
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: { [k: string]: any } = {};
        meta.c.map(
            (col: string) => {
                // deal with char column
                if (typeof result.data[col] === 'string') {
                    data[col] = result.data[col].split('');
                } else {
                    data[col] = result.data[col].map(formatterMap[col]);
                }
            }
        );
        result.data = data;
    }
    return result;
}

export { formatKTable };
