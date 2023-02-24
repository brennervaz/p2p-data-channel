import typescript from 'rollup-plugin-typescript2';
import alias from '@rollup/plugin-alias';
import replace from '@rollup/plugin-replace';
import path from 'path';

const resolve = (p) => path.resolve(__dirname, p);

export default {
  input: resolve('src/index.ts'),
  output: {
    file: resolve('dist/index.js'),
    format: 'esm'
  },
  plugins: [
    typescript(),
    alias({
      entries: [
        { find: '@src', replacement: resolve('src') }
      ]
    }),
    replace({
      preventAssignment: true,
      values: {
        '@src': resolve('dist')
      }
    })
  ]
};
