import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

const external = ['events'];

export default [
  // ES Module build
  {
    input: 'src/index.ts',
    output: {
      file: pkg.module,
      format: 'es'
    },
    external,
    plugins: [
      nodeResolve({ preferBuiltins: false }),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: './dist',
        rootDir: 'src'
      })
    ]
  },
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: pkg.main,
      format: 'cjs'
    },
    external,
    plugins: [
      nodeResolve({ preferBuiltins: false }),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      }),
      commonjs()
    ]
  },
  // UMD build
  {
    input: 'src/index.ts',
    output: {
      file: pkg.browser || 'dist/index.umd.js',
      format: 'umd',
      name: 'TheBaseEvent'
    },
    external,
    plugins: [
      nodeResolve({ preferBuiltins: false }),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      }),
      commonjs()
    ]
  },
  // Minified versions
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist',
      entryFileNames: '[name].min.[format]'
    },
    external,
    plugins: [
      nodeResolve({ preferBuiltins: false }),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      }),
      commonjs(),
      terser({
        compress: {
          drop_console: true
        }
      })
    ]
  }
];