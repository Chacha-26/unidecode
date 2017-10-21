
const SRC_DIR = 'raw_data';
const DST_DIR = 'generated';
const SHIFT_LENGTH = true;
const SUPPRESS_LOCAL = true;
const FILE_FILTER = /^x[0-9a-f]{3}\.py$/;

import * as fs from 'fs';

// Format

interface Info {
    global_idxs: number[];
    local_idxs: number[];
    local_str: string;
    lengths: number[];
}

const data = new Map<string, Info>();
let global_str = '';

const files = fs.readdirSync(SRC_DIR);

for (const fname of files) {
    if (FILE_FILTER.test(fname)) {

        const raw = fs.readFileSync(SRC_DIR + '/' + fname, 'utf8');
        const parsed = parsePythonArray(raw);

        const lengths = parsed.map(char => char.length);

        let local_str = '';
        const local_idxs = parsed.map((char, idx) => {
            let found = local_str.indexOf(char);
            if (found < 0) {
                found = local_str.length;
                local_str += char;
            }
            return found;
        });

        const global_idxs = parsed.map((char, idx) => {
            let found = global_str.indexOf(char);
            if (found < 0) {
                found = global_str.length;
                global_str += char;
            }
            return found;
        });

        data.set(fname.slice(0, 4), { global_idxs, local_idxs, local_str, lengths });
    }
}

let max_length = 0, global_max_index = 0, local_max_index = 0;
for (const val of data.values()) {
    global_max_index = Math.max(global_max_index, ...val.global_idxs);
    local_max_index = Math.max(local_max_index, ...val.local_idxs);
    max_length = Math.max(max_length, ...val.lengths);
}
// max_index = 00000000 00000000 00000000 00001010
// clz(...)  = 8 + 8 + 8 + 4 = 32 - 4;
// 32 - ...  = 4;
// ...       = number of bits needed
const global_index_bits = 32 - Math.clz32(global_max_index);
const local_index_bits = 32 - Math.clz32(local_max_index);
const length_bits = 32 - Math.clz32(max_length);

if (global_index_bits + length_bits > 32) {
    console.error(`${global_index_bits} + ${length_bits} = ${global_index_bits + length_bits} > 32.`);
    process.exit(1);
}

const local_index_mask = (1 << local_index_bits) - 1;
const local_index_shift = SHIFT_LENGTH ? 0 : local_index_bits;
const global_index_mask = (1 << global_index_bits) - 1;
const global_index_shift = SHIFT_LENGTH ? 0 : global_index_bits;
const length_mask = (1 << length_bits) - 1;
const length_shift = SHIFT_LENGTH ? length_bits : 0;

fs.writeFileSync(DST_DIR + '/constants.d.ts', `// This file was automatically generated. Changes will be undone.
declare namespace U2A {
    const enum $ {
        LOCAL_INDEX_BITS = ${ local_index_bits },
        LOCAL_INDEX_MASK = ${ local_index_mask },
        LOCAL_INDEX_SHIFT = ${ local_index_shift },
        GLOBAL_INDEX_BITS = ${ global_index_bits },
        GLOBAL_INDEX_MASK = ${ global_index_mask },
        GLOBAL_INDEX_SHIFT = ${ global_index_shift },
        LENGTH_BITS = ${ length_bits },
        LENGTH_MASK = ${ length_mask },
        LENGTH_SHIFT = ${ length_shift },
    }
}
`, { encoding: 'utf8' });

let combined = Object.create(null);
for (const [fname, val] of data) {
    const key = parseInt(fname.slice(1), 16);
    combined[key] = val.local_idxs.map((idx, i) => (idx << global_index_shift) | (val.lengths[i] << length_shift))
    const obj = [
        val.local_str,
        val.local_idxs.map((idx, i) => (idx << local_index_shift) | (val.lengths[i] << length_shift)),
    ];
    fs.writeFileSync(DST_DIR + '/' + fname + '.json', JSON.stringify(obj), { encoding: 'utf8' });
}
fs.writeFileSync(DST_DIR + '/combined.json', `[
    ${JSON.stringify(global_str)}
,{${
Object.keys(combined).map(key => `
    "${key}": [${ combined[key] }]`)}
}]`, { encoding: 'utf8' });

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
