export type QueryResult = {
    exception: boolean,
    type?: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    cols?: string[]
}
export enum QueryResultType {
    STDOUT = 1,
    STDERR,
    STRING,
    DICT,
    TABLE
}