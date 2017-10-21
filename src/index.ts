import { $, data, text } from './data';

const nonAscii = /[^\x00-\x7f]/gu;
let cache: Record<string, string> = Object.create(null);
let cache_size = 0;

function u2a(str: string): string {
    return String(str).replace(nonAscii, convert);
}

function convert(char: string): string {
    if (char in cache) {
        return cache[char];
    }

    // TODO: Better cache rotation
    cache_size += 1;
    if (cache_size > 100000) {
        cache = {};
        cache_size = 0;
    }

    const code = char.codePointAt(0);
    const hi = code >>> 8; // upper 24 bits
    const lo = code & 255; // lower 8 bits
    return cache[char] = hi in data ? unpack(data[hi][lo]) : '';
}

function unpack(code: number): string {
    if (code === 0) {
        return '';
    }
    const index = (code >>> $.INDEX_SHIFT) & $.INDEX_MASK;
    const length = (code >>> $.LENGTH_SHIFT) & $.LENGTH_MASK;
    return text.substr(index, length);
}

export default u2a;
