
const SRC_DIR = 'raw_data';
const DST_DIR = 'generated';
const SHIFT_LENGTH = true;
const FILE_FILTER = /^x[0-9a-f]{3}\.py$/;

import * as fs from 'fs';

// Format

interface Info {
    indices: number[];
    lengths: number[];
}

const data = new Map<string, Info>();
let str = '';

const files = fs.readdirSync(SRC_DIR);

for (const fname of files) {
    if (FILE_FILTER.test(fname)) {

        const raw = fs.readFileSync(SRC_DIR + '/' + fname, 'utf8');
        const parsed = parsePythonArray(raw);

        const lengths = parsed.map(char => char.length);

        const indices = parsed.map((char, idx) => {
            let found = str.indexOf(char);
            if (found < 0) {
                found = str.length;
                str += char;
            }
            return found;
        });

        data.set(fname.slice(0, 4), { indices, lengths });
    }
}

let max_length = 0, max_index = 0;
for (const val of data.values()) {
    max_index = Math.max(max_index, ...val.indices);
    max_length = Math.max(max_length, ...val.lengths);
}
// max_index = 00000000 00000000 00000000 00001010
// clz(...)  = 8 + 8 + 8 + 4 = 32 - 4;
// 32 - ...  = 4;
// ...       = number of bits needed
const index_bits = 32 - Math.clz32(max_index);
const length_bits = 32 - Math.clz32(max_length);

if (index_bits + length_bits > 32) {
    console.error(`${index_bits} + ${length_bits} = ${index_bits + length_bits} > 32.`);
    process.exit(1);
}

const index_mask = (1 << index_bits) - 1;
const index_shift = SHIFT_LENGTH ? 0 : index_bits;
const length_mask = (1 << length_bits) - 1;
const length_shift = SHIFT_LENGTH ? length_bits : 0;

let combined = Object.create(null);
for (const [fname, val] of data) {
    const key = parseInt(fname.slice(1), 16);
    combined[key] = val.indices.map((idx, i) => (idx << index_shift) | (val.lengths[i] << length_shift));
}

fs.writeFileSync(DST_DIR + '/index.ts', `// This file was automatically generated. Changes will be undone.

export const enum $ {
    INDEX_BITS = ${ index_bits },
    INDEX_MASK = ${ index_mask },
    INDEX_SHIFT = ${ index_shift },
    LENGTH_BITS = ${ length_bits },
    LENGTH_MASK = ${ length_mask },
    LENGTH_SHIFT = ${ length_shift },
}

export const str = 
${
    str.match(/.{1,101}/g).map(s => '    ' + JSON.stringify(s)).join(' +\n')
};

export const data = {${
    // Object.keys sorts numeric keys numerically for us
    Object.keys(combined)
    .filter(key => combined[key].find(x => x > 0)) // Filter out completely empty sections
    .map(key => '\n    0x' + ('00' + (+key).toString(16)).slice(-3) + ': [' + combined[key] + ']')
}
};

`, { encoding: 'utf8' });

process.exit(0);

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

function parsePythonArray(str: string): string[] {
    const state = [$.START];
    let quote = '"';
    
    const data: string[] = [];
    let pending = '';

    for (const char of str) {
        switch (state.pop()) {
            case $.START:
                if (char == '(') {
                    state.push($.BEFORE);
                } else {
                    state.push($.START);
                }
                break;

            case $.BEFORE:
                if (char == '\'' || char == '"') {
                    quote = char;
                    state.push($.READING);
                } else if (char == '#') {
                    state.push($.BEFORE, $.COMMENT);
                } else if (char == ')') {
                    state.push($.END);
                } else {
                    state.push($.BEFORE);
                }
                break;

            case $.READING:
                if (char == '\\') {
                    state.push($.ESCAPE);
                } else if (char == quote) {
                    data.push(pending);
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
                if (char == ',') {
                    state.push($.BEFORE);
                } else if (char == '#') {
                    state.push($.AFTER, $.COMMENT);
                } else if (char == ')') {
                    state.push($.END);
                } else {
                    state.push($.AFTER);
                }
                break;

            case $.COMMENT:
                if (char == '\n') {
                    // Revert to previous state
                } else {
                    state.push($.COMMENT);
                }
                break;

            case $.END:
                if (char == ' ' || char == '\t' || char == '\n' || char == '\r' || char == '\f' || char == '\v') {
                    state.push($.END);
                } else if (char == '#') {
                    state.push($.END, $.COMMENT);
                }
                break;

            default:
                throw new Error("Invalid State!");
        }
    }
    if (state.length !== 0 || state.pop() !== $.END) {

    }
    while (data.length < 256) {
        data.push('');
    }
    if (data.length != 256) {
        throw new Error("Too many elements in array!");
    }
    return data;
}
