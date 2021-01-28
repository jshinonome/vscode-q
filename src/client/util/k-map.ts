/**
 * Copyright (c) 2021 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

const kTypeMap = new Map<string, string>([
    ['b', 'boolean'],
    ['g', 'string'],
    ['x', 'integer'],
    ['h', 'integer'],
    ['i', 'integer'],
    ['j', 'integer'],
    ['e', 'float'],
    ['f', 'float'],
    ['c', 'string'],
    ['s', 'string'],
    ['p', 'timestamp'],
    ['m', 'month'],
    ['d', 'date'],
    ['z', 'datetime'],
    ['n', 'timespan'],
    ['u', 'minute'],
    ['v', 'second'],
    ['t', 'time'],
]);

const kTypeName = new Map<string, string>([
    ['b', 'boolean'],
    ['g', 'guid'],
    ['x', 'byte'],
    ['h', 'short'],
    ['i', 'integer'],
    ['j', 'long'],
    ['e', 'real'],
    ['f', 'float'],
    ['c', 'char'],
    ['s', 'symbol'],
    ['p', 'timestamp'],
    ['m', 'month'],
    ['d', 'date'],
    ['z', 'datetime'],
    ['n', 'timespan'],
    ['u', 'minute'],
    ['v', 'second'],
    ['t', 'time'],
    ['B', 'booleans'],
    ['G', 'guids'],
    ['X', 'bytes'],
    ['H', 'shorts'],
    ['I', 'integers'],
    ['J', 'longs'],
    ['E', 'reals'],
    ['F', 'floats'],
    ['C', 'chars'],
    ['S', 'symbols'],
    ['P', 'timestamps'],
    ['M', 'months'],
    ['D', 'dates'],
    ['Z', 'datetimes'],
    ['N', 'timespans'],
    ['U', 'minutes'],
    ['V', 'seconds'],
    ['T', 'times'],
    [' ', ''],
]);

const kAttributeMap = new Map<string, string>([
    ['s', 'sorted'],
    ['g', 'unique'],
    ['p', 'parted'],
    ['u', 'grouped'],
]);

export { kTypeMap, kTypeName, kAttributeMap };