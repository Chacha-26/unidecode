# Unidecode

## Description

A library for converting unicode text into a somewhat readable Ascii-only form.
Compatible with data from the following libraries
* https://github.com/avian2/unidecode
* http://search.cpan.org/perldoc?Text::Unidecode 

## Usage
```js
import unidecode from "@chacha-26/unidecode";
const example = "𝕷𝖔𝖗𝖊𝖒 𝖎𝖕𝖘𝖚𝖒 𝖉𝖔𝖑𝖔𝖗 𝖘𝖎𝖙 𝖆𝖒𝖊𝖙";
console.log(unidecode(example)); // "Lorem ipsum dolor sit amet"
```

## Development
* Generate data:      `node task data [perl | python]`
* Build source files: `node task build`
* Run tests:          `node task test`
* Delete generated files: `node task clean`

## Data acquisition
This library is compatible with the following sources:
* **Python (avian2/unidecode)**:
  Available as a git submodule. To download the latest version, run: 
  ```shell
  git submodule update --init
  ```
  from the project root.
* **Perl (Text::Unidecode)**:
  Not available as a git submodule. Download the .tar.gz archive from http://search.cpan.org/perldoc?Text::Unidecode and extract the folder somewhere. Open `src/generate_data.perl.ts` and update the `SRC_DIR` variable to point to the folder containing the `x00.pm`, `x01.pm`, ..., `xff.pm` files.

Once you have installed at least one of the data sources, you can run `node task build perl` or `node task build python` to generate usable `.js` files.

## License
This project is ISC licensed, but the data-sources needed to use it have the following licenses.
* **Python (avian2/unidecode)**:
  Copyright 2017, Tomaz Solc <tomaz.solc@tablix.org>

    This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 2 of the License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along with this program; if not, write to the Free Software Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. The programs and documentation in this dist are distributed in the hope that they will be useful, but without any warranty; without even the implied warranty of merchantability or fitness for a particular purpose.


* **Perl (Text::Unidecode)**:
  Copyright (c) 2001, 2014, 2015, 2016 Sean M. Burke.
  
  Unidecode is distributed under the Perl Artistic License ( perlartistic ), namely:
  
  This library is free software; you can redistribute it and/or modify it under the same terms as Perl itself.
  
  This program is distributed in the hope that it will be useful, but without any warranty; without even the implied warranty of merchantability or fitness for a particular purpose.

## Copyright
If using python (a.k.a. avian/unicode) then as the data source:
    Original character transliteration tables:
    Copyright 2001, Sean M. Burke <sburke@cpan.org>, all rights reserved.

    Python code and later additions:

    Copyright 2017, Tomaz Solc <tomaz.solc@tablix.org>

    This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 2 of the License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along with this program; if not, write to the Free Software Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. The programs and documentation in this dist are distributed in the hope that they will be useful, but without any warranty; without even the implied warranty of merchantability or fitness for a particular purpose.

Copyright (C) 2017  Chacha-26 <chacha-26@protonmail.com>

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
