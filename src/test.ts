import test from 'ava';
import unidecode from './index';

// Utilities

// Inclusive-Exclusive range
function* range(lo: number, hi: number) {
    for (let x = lo; x < hi; x++) {
        yield x;
    }
}

// number to character. Works with iterables too
function chr(val: number): string;
function chr(val: Iterable<number>): IterableIterator<string>;
function chr(val: number | Iterable<number>): string | Iterable<string> {
    if (typeof val === 'number') {
        return String.fromCodePoint(val);
    } else {
        return (function*() {
            for (const n of val) {
                yield String.fromCodePoint(n);
            }
        })();
    }
}

// character to number. Works with iterables too
function ord(val: string): number;
function ord(val: Iterable<string>): IterableIterator<number>;
function ord(val: string | Iterable<string>): number | IterableIterator<number> {
    if (typeof val === 'string') {
        return val.codePointAt(0);
    } else {
        return (function*() {
            for (const n of val) {
                yield n.codePointAt(0);
            }
        })();
    }
}

test('meta', (t) => {
    t.is(ord('9'), 0x39, 'ord(string)');
    t.deepEqual(
        Array.from(ord(['\x34', '\x36', '\u{10ffff}'])),
        [0x34, 0x36, 0x10ffff],
        'ord(Iterable<string>)'
    );

    t.is(chr(0x39), '9', 'chr(number)');
    t.deepEqual(
        Array.from(chr([0x34, 0x36, 0x10ffff])),
        ['\x34', '\x36', '\u{10ffff}'],
        'chr(Iterable<number>)'
    );

    t.deepEqual(
        Array.from( range(6, 10) ),
        [6, 7, 8, 9],
        'range(lo, hi)'
    );
});


// Tests
// Comments starting like // #
// are the original comments from unidecode's test.py

test('Low Ascii', (t) => {
    for (const char of chr(range(0, 0x80))) {
        t.is(unidecode(char), char, 'Low Ascii characters should be unaffected');
    }
});

test('Lone Surrogates', (t) => {
    for (const char of chr(range(0xd800, 0xe000))) {
        t.is(unidecode(char), '', 'Lone Surrogates should map to nothing');
    }
});

test('All possible characters', (t) => {
    // TODO: Fix cache size issues in cases like this
    for (const char of chr(range(0, 0x110000))) {
        t.notThrows(() => void unidecode(char));
    }
});

test('Non-BMP characters', (t) => {
    t.is(unidecode('\u{1d4e3}'), 'T');
});

test('Circled Latin', (t) => {
    const a = ord('a');
    t.deepEqual(
        Array.from( chr(range(a, a + 26)) ),
        Array.from( chr(range(0x24d0, 0x24d0 + 26)), x => unidecode(x) )
    );
});

test('Mathematical Latin', (t) => {
    // # 13 consecutive sequences of A-Z, a-z with some codepoints
    // # undefined. We just count the undefined ones and don't check
    // # positions.
    const a = ord('a'), A = ord('A');
    let empty = 0, alpha;
    for (const n of range(0x1d400, 0x1d6a4)) {
        const alpha = (n % 52 < 26) ? chr(A + n % 26) : chr(a + n % 26);
        const beta = unidecode(chr(n));
        if (beta == '') {
            empty += 1;
        } else {
            t.is(beta, alpha);
        }
    }
    t.is(empty, 24);
});

test('Mathematical digits', (t) => {
    const zero = ord('0');
    for (const n of range(0x1d7ce, 0x1d800)) {
        const a = chr(zero + ((n - 0x1d7ce) % 10));
        const b = unidecode(chr(n))
        t.is(a, b);
    }
});

test('Specific', (t) => {
    // Hello, World!
    t.is(unidecode('Hello, World!'), 'Hello, World!'); 
    // '"\r\n
    t.is(unidecode('\'"\r\n'), '\'"\r\n'); 
    // ČŽŠčžš
    t.is(unidecode('\u010c\u017d\u0160\u010d\u017e\u0161'), 'CZSczs'); 
    // ア
    t.is(unidecode('\u30a2'), 'a'); 
    // α
    t.is(unidecode('\u03b1'), 'a'); 
    // а
    t.is(unidecode('\u0430'), 'a'); 
    // château
    t.is(unidecode('ch\u00e2teau'), 'chateau'); 
    // viñedos
    t.is(unidecode('vi\u00f1edos'), 'vinedos'); 
    // 北亰
    t.is(unidecode('\u5317\u4eb0'), 'Bei Jing '); 
    // Efﬁcient
    t.is(unidecode('Ef\ufb01cient'), 'Efficient'); 
    // # https://github.com/iki/unidecode/commit/4a1d4e0a7b5a11796dc701099556876e7a520065
    // příliš žluťoučký kůň pěl ďábelské ódy
    t.is(unidecode('p\u0159\u00edli\u0161 \u017elu\u0165ou\u010dk\u00fd k\u016f\u0148 p\u011bl \u010f\u00e1belsk\u00e9 \u00f3dy'), 'prilis zlutoucky kun pel dabelske ody'); 
    // PŘÍLIŠ ŽLUŤOUČKÝ KŮŇ PĚL ĎÁBELSKÉ ÓDY
    t.is(unidecode('P\u0158\u00cdLI\u0160 \u017dLU\u0164OU\u010cK\u00dd K\u016e\u0147 P\u011aL \u010e\u00c1BELSK\u00c9 \u00d3DY'), 'PRILIS ZLUTOUCKY KUN PEL DABELSKE ODY'); 
    // # Table that doesn't exist
    // ꔀ
    t.is(unidecode('\ua500'), ''); 
    //# Table that has less than 256 entries
    // ỿ
    // t.is(unidecode('\u1eff'), ''); // This test is no longer relevant, since all tables are of length 256 now.

    t.is(unidecode('\u{1d5a0}'),'A');
    t.is(unidecode('\u{1d5c4}\u{1d5c6}/\u{1d5c1}'), 'km/h');
    t.is(unidecode('\u2124\u{1d552}\u{1d55c}\u{1d552}\u{1d55b} \u{1d526}\u{1d52a}\u{1d51e} \u{1d4e4}\u{1d4f7}\u{1d4f2}\u{1d4ec}\u{1d4f8}\u{1d4ed}\u{1d4ee} \u{1d4c8}\u{1d4c5}\u212f\u{1d4b8}\u{1d4be}\u{1d4bb}\u{1d4be}\u{1d4c0}\u{1d4b6}\u{1d4b8}\u{1d4be}\u{1d4bf}\u212f \u{1d59f}\u{1d586} \u{1d631}\u{1d62a}\u{1d634}\u{1d622}\u{1d637}\u{1d626}?!'),
        'Zakaj ima Unicode specifikacije za pisave?!');
});

test('wordpress remove accents', (t) => {
    // # This is the table from remove_accents() WordPress function.
    // # https://core.trac.wordpress.org/browser/trunk/wp-includes/formatting.php

    // # Decompositions for Latin-1 Supplement
    t.is(unidecode('\u00aa'), 'a'); t.is(unidecode('\u00ba'), 'o');
    t.is(unidecode('\u00c0'), 'A'); t.is(unidecode('\u00c1'), 'A');
    t.is(unidecode('\u00c2'), 'A'); t.is(unidecode('\u00c3'), 'A');
    t.is(unidecode('\u00c5'), 'A');
    t.is(unidecode('\u00c6'), 'AE');t.is(unidecode('\u00c7'), 'C');
    t.is(unidecode('\u00c8'), 'E'); t.is(unidecode('\u00c9'), 'E');
    t.is(unidecode('\u00ca'), 'E'); t.is(unidecode('\u00cb'), 'E');
    t.is(unidecode('\u00cc'), 'I'); t.is(unidecode('\u00cd'), 'I');
    t.is(unidecode('\u00ce'), 'I'); t.is(unidecode('\u00cf'), 'I');
    t.is(unidecode('\u00d0'), 'D'); t.is(unidecode('\u00d1'), 'N');
    t.is(unidecode('\u00d2'), 'O'); t.is(unidecode('\u00d3'), 'O');
    t.is(unidecode('\u00d4'), 'O'); t.is(unidecode('\u00d5'), 'O');
    t.is(unidecode('\u00d9'), 'U');
    t.is(unidecode('\u00da'), 'U'); t.is(unidecode('\u00db'), 'U');
    t.is(unidecode('\u00dd'), 'Y');
    t.is(unidecode('\u00e0'), 'a'); t.is(unidecode('\u00e1'), 'a');
    t.is(unidecode('\u00e2'), 'a'); t.is(unidecode('\u00e3'), 'a');
    t.is(unidecode('\u00e5'), 'a');
    t.is(unidecode('\u00e6'), 'ae');t.is(unidecode('\u00e7'), 'c');
    t.is(unidecode('\u00e8'), 'e'); t.is(unidecode('\u00e9'), 'e');
    t.is(unidecode('\u00ea'), 'e'); t.is(unidecode('\u00eb'), 'e');
    t.is(unidecode('\u00ec'), 'i'); t.is(unidecode('\u00ed'), 'i');
    t.is(unidecode('\u00ee'), 'i'); t.is(unidecode('\u00ef'), 'i');
    t.is(unidecode('\u00f0'), 'd'); t.is(unidecode('\u00f1'), 'n');
    t.is(unidecode('\u00f2'), 'o'); t.is(unidecode('\u00f3'), 'o');
    t.is(unidecode('\u00f4'), 'o'); t.is(unidecode('\u00f5'), 'o');
    t.is(unidecode('\u00f8'), 'o');
    t.is(unidecode('\u00f9'), 'u'); t.is(unidecode('\u00fa'), 'u');
    t.is(unidecode('\u00fb'), 'u');
    t.is(unidecode('\u00fd'), 'y'); t.is(unidecode('\u00fe'), 'th');
    t.is(unidecode('\u00ff'), 'y'); t.is(unidecode('\u00d8'), 'O');
    // # Decompositions for Latin Extended-A
    t.is(unidecode('\u0100'), 'A'); t.is(unidecode('\u0101'), 'a');
    t.is(unidecode('\u0102'), 'A'); t.is(unidecode('\u0103'), 'a');
    t.is(unidecode('\u0104'), 'A'); t.is(unidecode('\u0105'), 'a');
    t.is(unidecode('\u0106'), 'C'); t.is(unidecode('\u0107'), 'c');
    t.is(unidecode('\u0108'), 'C'); t.is(unidecode('\u0109'), 'c');
    t.is(unidecode('\u010a'), 'C'); t.is(unidecode('\u010b'), 'c');
    t.is(unidecode('\u010c'), 'C'); t.is(unidecode('\u010d'), 'c');
    t.is(unidecode('\u010e'), 'D'); t.is(unidecode('\u010f'), 'd');
    t.is(unidecode('\u0110'), 'D'); t.is(unidecode('\u0111'), 'd');
    t.is(unidecode('\u0112'), 'E'); t.is(unidecode('\u0113'), 'e');
    t.is(unidecode('\u0114'), 'E'); t.is(unidecode('\u0115'), 'e');
    t.is(unidecode('\u0116'), 'E'); t.is(unidecode('\u0117'), 'e');
    t.is(unidecode('\u0118'), 'E'); t.is(unidecode('\u0119'), 'e');
    t.is(unidecode('\u011a'), 'E'); t.is(unidecode('\u011b'), 'e');
    t.is(unidecode('\u011c'), 'G'); t.is(unidecode('\u011d'), 'g');
    t.is(unidecode('\u011e'), 'G'); t.is(unidecode('\u011f'), 'g');
    t.is(unidecode('\u0120'), 'G'); t.is(unidecode('\u0121'), 'g');
    t.is(unidecode('\u0122'), 'G'); t.is(unidecode('\u0123'), 'g');
    t.is(unidecode('\u0124'), 'H'); t.is(unidecode('\u0125'), 'h');
    t.is(unidecode('\u0126'), 'H'); t.is(unidecode('\u0127'), 'h');
    t.is(unidecode('\u0128'), 'I'); t.is(unidecode('\u0129'), 'i');
    t.is(unidecode('\u012a'), 'I'); t.is(unidecode('\u012b'), 'i');
    t.is(unidecode('\u012c'), 'I'); t.is(unidecode('\u012d'), 'i');
    t.is(unidecode('\u012e'), 'I'); t.is(unidecode('\u012f'), 'i');
    t.is(unidecode('\u0130'), 'I'); t.is(unidecode('\u0131'), 'i');
    t.is(unidecode('\u0132'), 'IJ');t.is(unidecode('\u0133'), 'ij');
    t.is(unidecode('\u0134'), 'J'); t.is(unidecode('\u0135'), 'j');
    t.is(unidecode('\u0136'), 'K'); t.is(unidecode('\u0137'), 'k');
    t.is(unidecode('\u0138'), 'k'); t.is(unidecode('\u0139'), 'L');
    t.is(unidecode('\u013a'), 'l'); t.is(unidecode('\u013b'), 'L');
    t.is(unidecode('\u013c'), 'l'); t.is(unidecode('\u013d'), 'L');
    t.is(unidecode('\u013e'), 'l'); t.is(unidecode('\u013f'), 'L');
    t.is(unidecode('\u0140'), 'l'); t.is(unidecode('\u0141'), 'L');
    t.is(unidecode('\u0142'), 'l'); t.is(unidecode('\u0143'), 'N');
    t.is(unidecode('\u0144'), 'n'); t.is(unidecode('\u0145'), 'N');
    t.is(unidecode('\u0146'), 'n'); t.is(unidecode('\u0147'), 'N');
    t.is(unidecode('\u0148'), 'n');
    t.is(unidecode('\u014c'), 'O'); t.is(unidecode('\u014d'), 'o');
    t.is(unidecode('\u014e'), 'O'); t.is(unidecode('\u014f'), 'o');
    t.is(unidecode('\u0150'), 'O'); t.is(unidecode('\u0151'), 'o');
    t.is(unidecode('\u0152'), 'OE');t.is(unidecode('\u0153'), 'oe');
    t.is(unidecode('\u0154'), 'R'); t.is(unidecode('\u0155'), 'r');
    t.is(unidecode('\u0156'), 'R'); t.is(unidecode('\u0157'), 'r');
    t.is(unidecode('\u0158'), 'R'); t.is(unidecode('\u0159'), 'r');
    t.is(unidecode('\u015a'), 'S'); t.is(unidecode('\u015b'), 's');
    t.is(unidecode('\u015c'), 'S'); t.is(unidecode('\u015d'), 's');
    t.is(unidecode('\u015e'), 'S'); t.is(unidecode('\u015f'), 's');
    t.is(unidecode('\u0160'), 'S'); t.is(unidecode('\u0161'), 's');
    t.is(unidecode('\u0162'), 'T'); t.is(unidecode('\u0163'), 't');
    t.is(unidecode('\u0164'), 'T'); t.is(unidecode('\u0165'), 't');
    t.is(unidecode('\u0166'), 'T'); t.is(unidecode('\u0167'), 't');
    t.is(unidecode('\u0168'), 'U'); t.is(unidecode('\u0169'), 'u');
    t.is(unidecode('\u016a'), 'U'); t.is(unidecode('\u016b'), 'u');
    t.is(unidecode('\u016c'), 'U'); t.is(unidecode('\u016d'), 'u');
    t.is(unidecode('\u016e'), 'U'); t.is(unidecode('\u016f'), 'u');
    t.is(unidecode('\u0170'), 'U'); t.is(unidecode('\u0171'), 'u');
    t.is(unidecode('\u0172'), 'U'); t.is(unidecode('\u0173'), 'u');
    t.is(unidecode('\u0174'), 'W'); t.is(unidecode('\u0175'), 'w');
    t.is(unidecode('\u0176'), 'Y'); t.is(unidecode('\u0177'), 'y');
    t.is(unidecode('\u0178'), 'Y'); t.is(unidecode('\u0179'), 'Z');
    t.is(unidecode('\u017a'), 'z'); t.is(unidecode('\u017b'), 'Z');
    t.is(unidecode('\u017c'), 'z'); t.is(unidecode('\u017d'), 'Z');
    t.is(unidecode('\u017e'), 'z'); t.is(unidecode('\u017f'), 's');
    // # Decompositions for Latin Extended-B
    t.is(unidecode('\u0218'), 'S'); t.is(unidecode('\u0219'), 's');
    t.is(unidecode('\u021a'), 'T'); t.is(unidecode('\u021b'), 't');

    // # Vowels with diacritic (Vietnamese)
    // # unmarked
    t.is(unidecode('\u01a0'), 'O'); t.is(unidecode('\u01a1'), 'o');
    t.is(unidecode('\u01af'), 'U'); t.is(unidecode('\u01b0'), 'u');
    // # grave accent
    t.is(unidecode('\u1ea6'), 'A'); t.is(unidecode('\u1ea7'), 'a');
    t.is(unidecode('\u1eb0'), 'A'); t.is(unidecode('\u1eb1'), 'a');
    t.is(unidecode('\u1ec0'), 'E'); t.is(unidecode('\u1ec1'), 'e');
    t.is(unidecode('\u1ed2'), 'O'); t.is(unidecode('\u1ed3'), 'o');
    t.is(unidecode('\u1edc'), 'O'); t.is(unidecode('\u1edd'), 'o');
    t.is(unidecode('\u1eea'), 'U'); t.is(unidecode('\u1eeb'), 'u');
    t.is(unidecode('\u1ef2'), 'Y'); t.is(unidecode('\u1ef3'), 'y');
    // # hook
    t.is(unidecode('\u1ea2'), 'A'); t.is(unidecode('\u1ea3'), 'a');
    t.is(unidecode('\u1ea8'), 'A'); t.is(unidecode('\u1ea9'), 'a');
    t.is(unidecode('\u1eb2'), 'A'); t.is(unidecode('\u1eb3'), 'a');
    t.is(unidecode('\u1eba'), 'E'); t.is(unidecode('\u1ebb'), 'e');
    t.is(unidecode('\u1ec2'), 'E'); t.is(unidecode('\u1ec3'), 'e');
    t.is(unidecode('\u1ec8'), 'I'); t.is(unidecode('\u1ec9'), 'i');
    t.is(unidecode('\u1ece'), 'O'); t.is(unidecode('\u1ecf'), 'o');
    t.is(unidecode('\u1ed4'), 'O'); t.is(unidecode('\u1ed5'), 'o');
    t.is(unidecode('\u1ede'), 'O'); t.is(unidecode('\u1edf'), 'o');
    t.is(unidecode('\u1ee6'), 'U'); t.is(unidecode('\u1ee7'), 'u');
    t.is(unidecode('\u1eec'), 'U'); t.is(unidecode('\u1eed'), 'u');
    t.is(unidecode('\u1ef6'), 'Y'); t.is(unidecode('\u1ef7'), 'y');
    // # tilde
    t.is(unidecode('\u1eaa'), 'A'); t.is(unidecode('\u1eab'), 'a');
    t.is(unidecode('\u1eb4'), 'A'); t.is(unidecode('\u1eb5'), 'a');
    t.is(unidecode('\u1ebc'), 'E'); t.is(unidecode('\u1ebd'), 'e');
    t.is(unidecode('\u1ec4'), 'E'); t.is(unidecode('\u1ec5'), 'e');
    t.is(unidecode('\u1ed6'), 'O'); t.is(unidecode('\u1ed7'), 'o');
    t.is(unidecode('\u1ee0'), 'O'); t.is(unidecode('\u1ee1'), 'o');
    t.is(unidecode('\u1eee'), 'U'); t.is(unidecode('\u1eef'), 'u');
    t.is(unidecode('\u1ef8'), 'Y'); t.is(unidecode('\u1ef9'), 'y');
    // # acute accent
    t.is(unidecode('\u1ea4'), 'A'); t.is(unidecode('\u1ea5'), 'a');
    t.is(unidecode('\u1eae'), 'A'); t.is(unidecode('\u1eaf'), 'a');
    t.is(unidecode('\u1ebe'), 'E'); t.is(unidecode('\u1ebf'), 'e');
    t.is(unidecode('\u1ed0'), 'O'); t.is(unidecode('\u1ed1'), 'o');
    t.is(unidecode('\u1eda'), 'O'); t.is(unidecode('\u1edb'), 'o');
    t.is(unidecode('\u1ee8'), 'U'); t.is(unidecode('\u1ee9'), 'u');
    //# dot below
    t.is(unidecode('\u1ea0'), 'A'); t.is(unidecode('\u1ea1'), 'a');
    t.is(unidecode('\u1eac'), 'A'); t.is(unidecode('\u1ead'), 'a');
    t.is(unidecode('\u1eb6'), 'A'); t.is(unidecode('\u1eb7'), 'a');
    t.is(unidecode('\u1eb8'), 'E'); t.is(unidecode('\u1eb9'), 'e');
    t.is(unidecode('\u1ec6'), 'E'); t.is(unidecode('\u1ec7'), 'e');
    t.is(unidecode('\u1eca'), 'I'); t.is(unidecode('\u1ecb'), 'i');
    t.is(unidecode('\u1ecc'), 'O'); t.is(unidecode('\u1ecd'), 'o');
    t.is(unidecode('\u1ed8'), 'O'); t.is(unidecode('\u1ed9'), 'o');
    t.is(unidecode('\u1ee2'), 'O'); t.is(unidecode('\u1ee3'), 'o');
    t.is(unidecode('\u1ee4'), 'U'); t.is(unidecode('\u1ee5'), 'u');
    t.is(unidecode('\u1ef0'), 'U'); t.is(unidecode('\u1ef1'), 'u');
    t.is(unidecode('\u1ef4'), 'Y'); t.is(unidecode('\u1ef5'), 'y');
    // # Vowels with diacritic (Chinese, Hanyu Pinyin)
    t.is(unidecode('\u0251'), 'a');
    // # macron
    t.is(unidecode('\u01d5'), 'U'); t.is(unidecode('\u01d6'), 'u');
    // # acute accent
    t.is(unidecode('\u01d7'), 'U'); t.is(unidecode('\u01d8'), 'u');
    // # caron
    t.is(unidecode('\u01cd'), 'A'); t.is(unidecode('\u01ce'), 'a');
    t.is(unidecode('\u01cf'), 'I'); t.is(unidecode('\u01d0'), 'i');
    t.is(unidecode('\u01d1'), 'O'); t.is(unidecode('\u01d2'), 'o');
    t.is(unidecode('\u01d3'), 'U'); t.is(unidecode('\u01d4'), 'u');
    t.is(unidecode('\u01d9'), 'U'); t.is(unidecode('\u01da'), 'u');
    // # grave accent
    t.is(unidecode('\u01db'), 'U'); t.is(unidecode('\u01dc'), 'u');

    t.is(unidecode('\u00c4'), 'A');
    t.is(unidecode('\u00d6'), 'O');
    t.is(unidecode('\u00dc'), 'U');
    // # t.is(unidecode('\u00df'), 's');
    t.is(unidecode('\u00e4'), 'a');
    t.is(unidecode('\u00f6'), 'o');
    t.is(unidecode('\u00fc'), 'u');

    //# Known differences:

    // # t.is(unidecode('\u00de'), 'TH');
    // # t.is(unidecode('\u0149'), 'N');
    // # t.is(unidecode('u00c5\ufffd'), 'n');
    // # t.is(unidecode('\u014b'), 'N');

    // # Euro Sign
    // # t.is(unidecode('\u20ac'), 'E');

    // # GBP (Pound) Sign
    // # t.is(unidecode('\u00a3'), '');"
});

test('Unicode text converter', (t) => {
    // # Examples from http://www.panix.com/~eli/unicode/convert.cgi
    t.is(unidecode('\uff54\uff48\uff45 \uff51\uff55\uff49\uff43\uff4b \uff42\uff52\uff4f\uff57\uff4e \uff46\uff4f\uff58 \uff4a\uff55\uff4d\uff50\uff53 \uff4f\uff56\uff45\uff52 \uff54\uff48\uff45 \uff4c\uff41\uff5a\uff59 \uff44\uff4f\uff47 \uff11\uff12\uff13\uff14\uff15\uff16\uff17\uff18\uff19\uff10'),
        'the quick brown fox jumps over the lazy dog 1234567890',
        'Full Width (lower)');

    t.is(unidecode('\u{1d565}\u{1d559}\u{1d556} \u{1d562}\u{1d566}\u{1d55a}\u{1d554}\u{1d55c} \u{1d553}\u{1d563}\u{1d560}\u{1d568}\u{1d55f} \u{1d557}\u{1d560}\u{1d569} \u{1d55b}\u{1d566}\u{1d55e}\u{1d561}\u{1d564} \u{1d560}\u{1d567}\u{1d556}\u{1d563} \u{1d565}\u{1d559}\u{1d556} \u{1d55d}\u{1d552}\u{1d56b}\u{1d56a} \u{1d555}\u{1d560}\u{1d558} \u{1d7d9}\u{1d7da}\u{1d7db}\u{1d7dc}\u{1d7dd}\u{1d7de}\u{1d7df}\u{1d7e0}\u{1d7e1}\u{1d7d8}'),
        'the quick brown fox jumps over the lazy dog 1234567890',
        'Double Struck (lower)'
    );
    
    t.is(unidecode('\u{1d42d}\u{1d421}\u{1d41e} \u{1d42a}\u{1d42e}\u{1d422}\u{1d41c}\u{1d424} \u{1d41b}\u{1d42b}\u{1d428}\u{1d430}\u{1d427} \u{1d41f}\u{1d428}\u{1d431} \u{1d423}\u{1d42e}\u{1d426}\u{1d429}\u{1d42c} \u{1d428}\u{1d42f}\u{1d41e}\u{1d42b} \u{1d42d}\u{1d421}\u{1d41e} \u{1d425}\u{1d41a}\u{1d433}\u{1d432} \u{1d41d}\u{1d428}\u{1d420} \u{1d7cf}\u{1d7d0}\u{1d7d1}\u{1d7d2}\u{1d7d3}\u{1d7d4}\u{1d7d5}\u{1d7d6}\u{1d7d7}\u{1d7ce}'),
        'the quick brown fox jumps over the lazy dog 1234567890',
        'Bold (lower)'
    );

    t.is(unidecode('\u{1d495}\u{1d489}\u{1d486} \u{1d492}\u{1d496}\u{1d48a}\u{1d484}\u{1d48c} \u{1d483}\u{1d493}\u{1d490}\u{1d498}\u{1d48f} \u{1d487}\u{1d490}\u{1d499} \u{1d48b}\u{1d496}\u{1d48e}\u{1d491}\u{1d494} \u{1d490}\u{1d497}\u{1d486}\u{1d493} \u{1d495}\u{1d489}\u{1d486} \u{1d48d}\u{1d482}\u{1d49b}\u{1d49a} \u{1d485}\u{1d490}\u{1d488} 1234567890'),
        'the quick brown fox jumps over the lazy dog 1234567890',
        'Bold italic (lower)'
    );
    
    t.is(unidecode('\u{1d4fd}\u{1d4f1}\u{1d4ee} \u{1d4fa}\u{1d4fe}\u{1d4f2}\u{1d4ec}\u{1d4f4} \u{1d4eb}\u{1d4fb}\u{1d4f8}\u{1d500}\u{1d4f7} \u{1d4ef}\u{1d4f8}\u{1d501} \u{1d4f3}\u{1d4fe}\u{1d4f6}\u{1d4f9}\u{1d4fc} \u{1d4f8}\u{1d4ff}\u{1d4ee}\u{1d4fb} \u{1d4fd}\u{1d4f1}\u{1d4ee} \u{1d4f5}\u{1d4ea}\u{1d503}\u{1d502} \u{1d4ed}\u{1d4f8}\u{1d4f0} 1234567890'),
        'the quick brown fox jumps over the lazy dog 1234567890',
        'Bold script (lower)'
    );

    t.is(unidecode('\u{1d599}\u{1d58d}\u{1d58a} \u{1d596}\u{1d59a}\u{1d58e}\u{1d588}\u{1d590} \u{1d587}\u{1d597}\u{1d594}\u{1d59c}\u{1d593} \u{1d58b}\u{1d594}\u{1d59d} \u{1d58f}\u{1d59a}\u{1d592}\u{1d595}\u{1d598} \u{1d594}\u{1d59b}\u{1d58a}\u{1d597} \u{1d599}\u{1d58d}\u{1d58a} \u{1d591}\u{1d586}\u{1d59f}\u{1d59e} \u{1d589}\u{1d594}\u{1d58c} 1234567890'),
        'the quick brown fox jumps over the lazy dog 1234567890',
        'Fraktur (lower)'
    );

    t.is(unidecode('\uff34\uff28\uff25 \uff31\uff35\uff29\uff23\uff2b \uff22\uff32\uff2f\uff37\uff2e \uff26\uff2f\uff38 \uff2a\uff35\uff2d\uff30\uff33 \uff2f\uff36\uff25\uff32 \uff34\uff28\uff25 \uff2c\uff21\uff3a\uff39 \uff24\uff2f\uff27 \uff11\uff12\uff13\uff14\uff15\uff16\uff17\uff18\uff19\uff10'),
        'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG 1234567890',
        'Full Width (upper)');

    t.is(unidecode('\u{1d54b}\u210d\u{1d53c} \u211a\u{1d54c}\u{1d540}\u2102\u{1d542} \u{1d539}\u211d\u{1d546}\u{1d54e}\u2115 \u{1d53d}\u{1d546}\u{1d54f} \u{1d541}\u{1d54c}\u{1d544}\u2119\u{1d54a} \u{1d546}\u{1d54d}\u{1d53c}\u211d \u{1d54b}\u210d\u{1d53c} \u{1d543}\u{1d538}\u2124\u{1d550} \u{1d53b}\u{1d546}\u{1d53e} \u{1d7d9}\u{1d7da}\u{1d7db}\u{1d7dc}\u{1d7dd}\u{1d7de}\u{1d7df}\u{1d7e0}\u{1d7e1}\u{1d7d8}'),
        'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG 1234567890',
        'Double Struck (upper)'
    );
    
    t.is(unidecode('\u{1d413}\u{1d407}\u{1d404} \u{1d410}\u{1d414}\u{1d408}\u{1d402}\u{1d40a} \u{1d401}\u{1d411}\u{1d40e}\u{1d416}\u{1d40d} \u{1d405}\u{1d40e}\u{1d417} \u{1d409}\u{1d414}\u{1d40c}\u{1d40f}\u{1d412} \u{1d40e}\u{1d415}\u{1d404}\u{1d411} \u{1d413}\u{1d407}\u{1d404} \u{1d40b}\u{1d400}\u{1d419}\u{1d418} \u{1d403}\u{1d40e}\u{1d406} \u{1d7cf}\u{1d7d0}\u{1d7d1}\u{1d7d2}\u{1d7d3}\u{1d7d4}\u{1d7d5}\u{1d7d6}\u{1d7d7}\u{1d7ce}'),
        'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG 1234567890',
        'Bold (upper)'
    );

    t.is(unidecode('\u{1d47b}\u{1d46f}\u{1d46c} \u{1d478}\u{1d47c}\u{1d470}\u{1d46a}\u{1d472} \u{1d469}\u{1d479}\u{1d476}\u{1d47e}\u{1d475} \u{1d46d}\u{1d476}\u{1d47f} \u{1d471}\u{1d47c}\u{1d474}\u{1d477}\u{1d47a} \u{1d476}\u{1d47d}\u{1d46c}\u{1d479} \u{1d47b}\u{1d46f}\u{1d46c} \u{1d473}\u{1d468}\u{1d481}\u{1d480} \u{1d46b}\u{1d476}\u{1d46e} 1234567890'),
        'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG 1234567890',
        'Bold italic (upper)'
    );
    
    t.is(unidecode('\u{1d4e3}\u{1d4d7}\u{1d4d4} \u{1d4e0}\u{1d4e4}\u{1d4d8}\u{1d4d2}\u{1d4da} \u{1d4d1}\u{1d4e1}\u{1d4de}\u{1d4e6}\u{1d4dd} \u{1d4d5}\u{1d4de}\u{1d4e7} \u{1d4d9}\u{1d4e4}\u{1d4dc}\u{1d4df}\u{1d4e2} \u{1d4de}\u{1d4e5}\u{1d4d4}\u{1d4e1} \u{1d4e3}\u{1d4d7}\u{1d4d4} \u{1d4db}\u{1d4d0}\u{1d4e9}\u{1d4e8} \u{1d4d3}\u{1d4de}\u{1d4d6} 1234567890'),
        'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG 1234567890',
        'Bold script (upper)'
    );

    t.is(unidecode('\u{1d57f}\u{1d573}\u{1d570} \u{1d57c}\u{1d580}\u{1d574}\u{1d56e}\u{1d576} \u{1d56d}\u{1d57d}\u{1d57a}\u{1d582}\u{1d579} \u{1d571}\u{1d57a}\u{1d583} \u{1d575}\u{1d580}\u{1d578}\u{1d57b}\u{1d57e} \u{1d57a}\u{1d581}\u{1d570}\u{1d57d} \u{1d57f}\u{1d573}\u{1d570} \u{1d577}\u{1d56c}\u{1d585}\u{1d584} \u{1d56f}\u{1d57a}\u{1d572} 1234567890'),
        'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG 1234567890',
        'Fraktur (upper)'
    );
});

test('Enclosed Alphanumerics', (t) => {
    // ⓐⒶ⑳⒇⒛⓴⓾⓿
    t.is(unidecode('\u24d0\u24b6\u2473\u2487\u249b\u24f4\u24fe\u24ff'), 'aA20(20)20.20100');
});
