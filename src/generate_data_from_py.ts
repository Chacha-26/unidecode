
const SRC_DIR = 'src/data';
const DST_DIR = 'src';
const FILE_FILTER = /^x[0-9a-f]{3}\.py$/;

import * as fs from 'fs';

const data = Object.create(null);

const files = fs.readdirSync(SRC_DIR);

for (const fname of files) {
    if (FILE_FILTER.test(fname)) {

        const raw = fs.readFileSync(SRC_DIR + '/' + fname, 'utf8');
        const key = parseInt(fname.slice(1, 4), 16);
        data[key] = parsePythonArray(raw);
    }
}

// Closure style array compression
function asStr(arr: string[]) {
    const savings = arr.length * 2 - '"".split("?")'.length;
    if (savings > 0) {
        for (const opt of '; `') {
            const joined = arr.join(opt);
            if (joined.split(opt).length === arr.length) {
                return `${ JSON.stringify(joined)  }.split("${opt}")`;
            }
        }
    }
    return JSON.stringify(arr);
}

// Write data to file
fs.writeFileSync(DST_DIR + '/data.ts', `// This file was automatically generated. Changes will be undone.
// tslint:disable
export const data = {
    ${
    // Object.keys sorts numeric keys numerically for us
    Object.keys(data)
    .filter((key) => data[key].some((x) => x !== '')) // Filter out completely empty sections
    .map((key) => '0x' + ('00' + (+key).toString(16)).slice(-3) + ': ' + asStr(data[key])).join(',\n    ')
}
};
`, { encoding: 'utf8' });

// Other stuff below

const enum $ {
    START,   // Up until the first (
    BEFORE,  // Before a ' or "
    READING, // Processing content
    AFTER,   // Between '' , or "" , // Normally 0 length
    ESCAPE,
    COMMENT,
    END,
}

// Simple state machine for parsing a single array of strings from a python file
// Does not support triple-quoted strings
function parsePythonArray(str: string): string[] {
    const state = [$.START];
    let quote = '"';

    const output: string[] = [];
    let pending = '';

    for (const char of str) {
        switch (state.pop()) {
            case $.START:
                if (char === '(') {
                    state.push($.BEFORE);
                } else {
                    state.push($.START);
                }
                break;

            case $.BEFORE:
                if (char === '\'' || char === '"') {
                    quote = char;
                    state.push($.READING);
                } else if (char === '#') {
                    state.push($.BEFORE, $.COMMENT);
                } else if (char === ')') {
                    state.push($.END);
                } else {
                    state.push($.BEFORE);
                }
                break;

            case $.READING:
                if (char === '\\') {
                    state.push($.ESCAPE);
                } else if (char === quote) {
                    output.push(pending);
                    pending = '';
                    state.push($.AFTER);
                } else {
                    pending += char;
                    state.push($.READING);
                }
                break;

            case $.ESCAPE:
                pending += char;
                state.push($.READING);
                break;

            case $.AFTER:
                if (char === ',') {
                    state.push($.BEFORE);
                } else if (char === '#') {
                    state.push($.AFTER, $.COMMENT);
                } else if (char === ')') {
                    state.push($.END);
                } else {
                    state.push($.AFTER);
                }
                break;

            case $.COMMENT:
                if (char === '\n') {
                    // Revert to previous state
                } else {
                    state.push($.COMMENT);
                }
                break;

            case $.END:
                if (char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '\f' || char === '\v') {
                    state.push($.END);
                } else if (char === '#') {
                    state.push($.END, $.COMMENT);
                }
                break;

            default:
                throw new Error('Invalid State!');
        }
    }
    if (state.length !== 0 || state.pop() !== $.END) {
        // Extra data at end. Ignore?
    }
    while (output.length < 256) {
        output.push('');
    }
    if (output.length !== 256) {
        throw new Error('Too many elements in array!');
    }
    return output;
}
