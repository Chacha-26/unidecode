export default ['amd', 'cjs', 'es', 'iife', 'umd'].map((fmt) => ({
    input: 'build/index.js',
    output: {
        file: `dist/bundle.${fmt}.js`,
        format: `${fmt}`,
        name: 'unidecode',
    },
    exports: 'default'
}));
