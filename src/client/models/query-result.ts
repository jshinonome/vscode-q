/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

export type QueryResult = {
    type: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    cols?: string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    meta?: any,
    keys?: string[],
    query?: string,
    labelCol?: string,
    numericCols?: string[]
}
