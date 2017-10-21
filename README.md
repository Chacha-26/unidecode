# U2A

## Description

A small library for converting unicode text into a somewhat readable Ascii-only form.
Designed to be compatible with the data in https://github.com/avian2/unidecode/tree/master/unidecode
Copy those files into src/data then run `npm run build`.

## Usage
```js
import u2a from "@chacha-26/unidecode";
const example = "𝕷𝖔𝖗𝖊𝖒 𝖎𝖕𝖘𝖚𝖒 𝖉𝖔𝖑𝖔𝖗 𝖘𝖎𝖙 𝖆𝖒𝖊𝖙, 𝖈𝖔𝖓𝖘𝖊𝖈𝖙𝖊𝖙𝖚𝖗 𝖆𝖉𝖎𝖕𝖎𝖘𝖈𝖎𝖓𝖌 𝖊𝖑𝖎𝖙";
console.log(u2a(example)); // Lorem ipsum dolor sit amet, consectetur adipiscing elit
```
