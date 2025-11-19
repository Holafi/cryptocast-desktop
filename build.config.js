module.exports = {
  main: {
    entry: 'src/main/index.ts',
    sourceMap: true,
    target: 'node18',
    minify: false,
  },
  renderer: {
    entry: 'src/renderer/src/main.tsx',
    sourceMap: true,
    target: 'es2020',
    minify: false,
  }
};