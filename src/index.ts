import { data } from './data';

const nonAscii = /[^\x00-\x7f]/gu;

function u2a(str: string): string {
    return String(str).replace(nonAscii, convert);
}

function convert(char: string): string {
    const code = char.codePointAt(0);
    const hi = code >>> 8; // upper 24 bits
    const lo = code & 255; // lower 8 bits
    return hi in data ? data[hi][lo] : '';
}

export default u2a;
