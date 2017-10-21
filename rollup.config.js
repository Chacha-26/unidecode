export default {
    input: 'build/index.js',
    output: {
        file: 'dist/bundle.js',
        format: 'umd',
        name: 'unidecode',
    },
    exports: 'default',
};
