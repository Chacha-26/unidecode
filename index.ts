/// <reference path="generated/constants.d.ts" />

const nonAscii = /[^\x00-\x7f]/gu;
const cache: Record<string, string> = Object.create(null);

function u2a(str: string): string {
    return String(str).replace(nonAscii, convert);
}

function convert(char: string): string {
    if (char in cache) {
        return cache[char];
    }
    const code = char.codePointAt(0);
    const hi = code >> 8;
    const lo = code & ((1 << 8) - 1);
    if (hi in data) {

    }
}

export default u2a;