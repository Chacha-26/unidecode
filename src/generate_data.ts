let [, , source = 'perl'] = process.argv;
source = source.toLowerCase();

import writeData from './write_to_file';
import perl from './generate_data.perl';
import python from './generate_data.python';

switch (source.toLowerCase()) {
    case 'perl':
        writeData(perl())
        break;

    case 'python':
        writeData(python())
        break;

    default:
        console.error(`Unsupported data-source: ${ source }.`);
        process.exitCode = 1;
        break;
}
