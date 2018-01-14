import * as fs from 'fs';

const SRC_DIR = 'src/perl/Text-Unidecode-1.30/lib/Text/Unidecode';
const FILE_FILTER = /^x([0-9a-f]{2})\.pm$/;
const HEX = /^[0-9a-f]$/i;

export default () => {
    const data = Object.create(null) as Record<string, string[]>;
    const files = fs.readdirSync(SRC_DIR);

    for (const filename of files) {
        const match = filename.match(FILE_FILTER);
        if (match) {
            const raw = fs.readFileSync(SRC_DIR + '/' + filename, 'utf8');
            const parsed = parsePerlArray(raw);
            const key = parseInt(match[1], 16);
            if (key === 0) {
                parsed.fill('', 0x00, 0x80); // 0-\x7f are always unchanged
                parsed.fill('', 0x80, 0xa0); // Override Latin-1 block. See x00.pm for details
            }
            data[key] = parsed;
        }
    }

    return data;
};

const enum $ {
    COMMENT, // Stacks

    BEFORE_ASSIGNMENT,
    BEFORE_ARRAY,
    BEFORE_VALUE,
    BEFORE_COMMA,

    ONE_Q,
    TWO_Q,
    IN_QUOTE,
    ESCAPE, // Stacks
    START_HEX, // \x
    SHORT_HEX, // \xHH
    LONG_HEX, // \x{HHHHHH...H}
}

// Simple state machine for parsing a single array of strings from a perl file
// Does not support HEREDOCs
function parsePerlArray(str: string): string[] {
    const state = [$.BEFORE_ASSIGNMENT];
    let interpolate = false; // Perl only interpolates on " and qq type strings
    let startquote = ''; // Perl supports nesting quotes with q and qq strings
    let endquote = '';
    let quotedepth = 0;

    const output: string[] = [];
    let pending = '';
    let pendinghex = '';

    loop: for (const char of str) {
        switch (state.pop()) {
            case $.BEFORE_ASSIGNMENT:
                if (char === '#') {
                    state.push($.BEFORE_ASSIGNMENT, $.COMMENT);
                } else if (char === '=') {
                    state.push($.BEFORE_ARRAY);
                } else {
                    state.push($.BEFORE_ASSIGNMENT);
                }
                break;

            case $.BEFORE_ARRAY:
                if (char === '#') {
                    state.push($.BEFORE_ARRAY, $.COMMENT);
                } else if (char === '[') {
                    state.push($.BEFORE_VALUE);
                } else if (char === 'T') {
                    // Text::Unidecode::make_placeholder_map();
                    break loop; // Stop processing
                } else {
                    state.push($.BEFORE_ARRAY);
                }
                break;

            case $.BEFORE_VALUE:
                if (char === '#') {
                    state.push($.BEFORE_VALUE, $.COMMENT);
                } else if (char === 'q') {
                    state.push($.ONE_Q);
                } else if (char === '\'' || char === '"') {
                    interpolate = char === '"';
                    startquote = ''; // No nesting
                    endquote = char;
                    state.push($.IN_QUOTE);
                } else if (char === ']') {
                    break loop; // Stop processing
                } else {
                    state.push($.BEFORE_VALUE);
                }
                break;

            case $.ONE_Q:
                interpolate = false;
                if (char === 'q') {
                    interpolate = true;
                    state.push($.TWO_Q);
                    break;
                }
                // Falls thorough
            case $.TWO_Q:
                if (char === '(') { // q(x) or qq(x)
                    startquote = '(', endquote = ')';

                } else if (char === '{') { // q{x} or qq{x}
                    startquote = '{', endquote = '}';
                } else if (char === '[') { // q[x] or qq[x]
                    startquote = '[', endquote = ']';
                } else {
                    throw new SyntaxError(`Expected (, {, or [ after q or qq, but instead found ${char}.`);
                }
                state.push($.IN_QUOTE);
                break;

            case $.IN_QUOTE:
                if (interpolate && char === '\\') {
                    state.push($.IN_QUOTE, $.ESCAPE);
                } else if (char === endquote) {
                    if (quotedepth < 1) {
                        output.push(pending);
                        pending = '';
                        state.push($.BEFORE_COMMA);
                    } else {
                        quotedepth -= 1;
                        pending += char;
                        state.push($.IN_QUOTE);
                    }
                } else if (char === startquote) {
                    quotedepth += 1;
                    pending += char;
                    state.push($.IN_QUOTE);
                } else if (char === '\n' || char === '\r') {
                    throw new SyntaxError('Unexpected line break in string');
                } else if (interpolate && (char === '$' || char === '@')) {
                    throw new SyntaxError(`Interpolation using ${char} is not supported`);
                } else {
                    pending += char;
                    state.push($.IN_QUOTE);
                }
                break;

            case $.ESCAPE:
                if (char === 'x') {
                    state.push($.START_HEX);
                } else {
                    pending += char;
                    state.push($.IN_QUOTE);
                }
                break;

            case $.START_HEX:
                if (HEX.test(char)) {
                    pendinghex = char;
                    state.push($.SHORT_HEX);
                } else if (char === '{') {
                    pendinghex = '';
                    state.push($.LONG_HEX);
                } else {
                    throw new SyntaxError(`Expected [0-9a-f{] after \\x, but got ${char}.`);
                }
                break;

            case $.SHORT_HEX:
                if (HEX.test(char)) {
                    pendinghex += char;
                    const codepoint = parseInt(pendinghex, 16);
                    pending += String.fromCodePoint(codepoint);
                    pendinghex = '';
                    // Revert to previous state
                } else {
                    throw new SyntaxError(`Expected [0-9a-f] after \\x${pendinghex}, but got ${char}.`);
                }
                break;

            case $.LONG_HEX:
                if (HEX.test(char)) {
                    pendinghex += char;
                    state.push($.LONG_HEX);
                } else if (char === '}') {
                    const codepoint = parseInt(pendinghex, 16);
                    pending += String.fromCodePoint(codepoint);
                    pendinghex = '';
                    // Revert to previous state
                } else {
                    throw new SyntaxError(`Expected [0-9a-f}] after \\x{${pendinghex}, but got ${char}.`);
                }
                break;

            case $.BEFORE_COMMA:
                if (char === ',') {
                    state.push($.BEFORE_VALUE);
                } else if (char === '#') {
                    state.push($.BEFORE_COMMA, $.COMMENT);
                } else if (char === ']') {
                    break loop;
                } else {
                    state.push($.BEFORE_COMMA);
                }
                break;

            case $.COMMENT:
                if (char === '\n') {
                    // Revert to previous state
                } else {
                    state.push($.COMMENT);
                }
                break;

            default:
                throw new Error('Invalid State!');
        }
    }
    if (state.length !== 0) {
        // Ignore extra data at end.
    }
    while (output.length < 256) {
        output.push('');
    }
    if (output.length > 256) {
        throw new Error('Too many elements in array!');
    }
    return output;
}
