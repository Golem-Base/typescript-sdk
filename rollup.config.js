import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import { minify } from 'rollup-plugin-esbuild-minify';
import pkg from './package.json' with { type: "json" };

export default [{
  input: 'dist/index.js',
  output: {
    name: "golem_base_sdk",
    file: pkg.browser,
    format: 'iife',
    sourcemap: true,
  },
  plugins: [
    resolve(),
    commonjs(),
    nodePolyfills(),
    minify()
  ],
}];
