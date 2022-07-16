import fs from 'graceful-fs';
import { formatKTable } from '../src/client/util/format';

test('no null', () => {
    const fileContent = fs.readFileSync('test/data/qr_temporal_types.json', 'utf-8');
    const queryResult = JSON.parse(fileContent);
    const formatedResult = formatKTable(queryResult);
    expect(formatedResult.data).toStrictEqual({
        timestamp: ['2022-07-16T23:42:04.124'],
        month: ['2022-07'],
        date: ['2022-07-16'],
        datetime: ['2022-07-16T23:42:04.124'],
        timespan: ['23:42:04.124'],
        minute: ['23:42'],
        second: ['23:42:04'],
        time: ['23:42:04.123']
    });
});
test('with nulls', () => {
    const fileContent = fs.readFileSync('test/data/qr_null_temporal_types.json', 'utf-8');
    const queryResult = JSON.parse(fileContent);
    const formatedResult = formatKTable(queryResult);
    expect(formatedResult.data).toStrictEqual({
        datetime: ['2022-07-16T23:42:18.758', 'Invalid Date'],
        date: ['2022-07-16', 'Invalid Date'],
    });
});
