import * as fs from 'fs';

const DST_FILE = 'src/data.ts';

export default (data: Record<string, string[]>, prelude = '') => {
    const contents = `${ prelude && prelude + '\n' }// This file was automatically generated. Changes will be undone.
        // tslint:disable
        export const data = {
            ${ formatData(data) }
        };
        `.replace(/^ {8}/gm, '');

    fs.writeFileSync(DST_FILE, contents, { encoding: 'utf8' });
};

function formatData(data: Record<string, string[]>) {
    return Object
        .keys(data)
        .filter((key) => Array.isArray(data[key]) && data[key].some((x) => x !== ''))
        .map((key) => `${ printKey(key) }: ${ printValues(data[key]) }`)
        .join(',\n    ');
}

function printKey(key: string) {
    return (+key).toString(16).padStart(5, '0x000');
}

function printValues(arr: string[]) {
    const savings = arr.length * 2 - '"".split("?")'.length;
    if (savings > 0) {
        for (const opt of '; `') {
            const joined = arr.join(opt);
            if (joined.split(opt).length === arr.length) {
                return `${ JSON.stringify(joined) }.split("${opt}")`;
            }
        }
    }
    return JSON.stringify(arr);
}
