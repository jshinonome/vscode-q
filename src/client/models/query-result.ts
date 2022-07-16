/* eslint-disable @typescript-eslint/no-explicit-any */
export type QueryResult = {
    type: string,
    data: any,
    cols?: any[],
    meta?: { c: string[], t: string, f: string[], a: string[] },
    keys?: string[],
    query?: string,
    labelCol?: string,
    numericCols?: string[],
    duration: number,
    uniqLabel: string,
}
