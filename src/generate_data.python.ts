import * as fs from 'fs';

const SRC_DIR = 'src/avian2/unidecode/unidecode';
const FILE_FILTER = /^x([0-9a-f]{3})\.py$/;

export default () => {
    const data = Object.create(null) as Record<string, string[]>;
    const files = fs.readdirSync(SRC_DIR);

    for (const filename of files) {
        const match = filename.match(FILE_FILTER);
        if (match) {
            const raw = fs.readFileSync(SRC_DIR + '/' + filename, 'utf8');
            const parsed = parsePythonArray(raw);
            const key = parseInt(match[1], 16);
            data[key] = parsed;
        }
    }

    return data;
};

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
    if (output.length > 256) {
        throw new Error('Too many elements in array!');
    }
    return output;
}
