import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import terser from '@rollup/plugin-terser';
import pkg from './package.json' with { type: "json" };

import { globSync } from 'glob'
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export default [
  {
    input: Object.fromEntries(
      globSync('src/**/*.ts').map(file => [
        // This removes `src/` as well as the file extension from each
        // file, so e.g. src/nested/foo.js becomes nested/foo
        path.relative(
          'src',
          file.slice(0, file.length - path.extname(file).length)
        ),
        // This expands the relative paths to absolute paths, so e.g.
        // src/nested/foo becomes /project/src/nested/foo.js
        fileURLToPath(new URL(file, import.meta.url))
      ])
    ),

    output: [
      {
        dir: "dist",
        // This is a lie, because the format is whatever tsc produces, see below
        format: 'es',
        sourcemap: true,
      },
    ],

    plugins: [
      nodePolyfills({
        sourceMap: true,
        // using null here polyfills all files, including our own source files
        include: null,
      }),
      nodeResolve(),
      commonjs({
        // TODO: do we need this?
        //include: "node_modules/**",
      }),
      typescript({
        compilerOptions: {
          // TODO: we want to generate es modules, but when we do, we get an error
          // from node-polyfill
          //module: "esnext",
        },
      }),
    ],
  },
  {
    // TODO: why can we not use src/index.ts here?
    // We get an error from node-polyfill when we do.
    // Using js here, means that we don't have useful sourcemaps though
    input: 'dist/index.js',

    output: [
      {
        name: "golem_base_sdk",
        file: `dist/${pkg.name}.min.js`,
        format: "umd",
        sourcemap: true,
      }
    ],

    plugins: [
      nodeResolve(),
      commonjs(),
      nodePolyfills({
        sourceMap: true,
        // using null here polyfills all files, including our own source files
        include: null,
      }),
      terser()
    ],
  },
];
