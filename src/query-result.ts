export type QueryResult = {
    type: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any
}
export enum QueryResultType {
    STDOUT = 1,
    STDERR,
    STRING,
    DICT,
    TABLE
}