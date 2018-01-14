import { data } from './data';
const nonAscii = /[^\x00-\x7f]/gu;
const unidecode = (str) => String(str).replace(nonAscii, convert);
const convert = (char) => {
    const code = char.codePointAt(0);
    const hi = code >>> 8;
    const lo = code & 255;
    return hi in data ? data[hi][lo] : '';
};
export default unidecode;
