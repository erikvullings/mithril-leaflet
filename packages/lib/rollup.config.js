import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import sourceMaps from 'rollup-plugin-sourcemaps';
import typescript from 'rollup-plugin-typescript2';
import postcss from 'rollup-plugin-postcss';
import json from 'rollup-plugin-json';
import simplevars from 'postcss-simple-vars';
import nested from 'postcss-nested';
import postcssPresetEnv from 'postcss-preset-env';
import cssnano from 'cssnano';
import image from 'rollup-plugin-img';
import { terser } from 'rollup-plugin-terser';

const pkg = require('./package.json');
const production = !process.env.ROLLUP_WATCH;

export default {
  input: `src/index.ts`,
  watch: 'src/**',
  context: 'null',
  moduleContext: 'null',
  output: [
    {
      name: 'mithrilleaflet',
      file: pkg.main,
      format: 'iife',
      sourcemap: true,
      globals: { mithril: 'm' },
    },
    {
      file: pkg.module,
      format: 'es',
      sourcemap: true,
      globals: { mithril: 'm' },
    },
  ],
  // Indicate here external modules you don't want to include in your bundle
  external: ['mithril'],
  watch: {
    include: 'src/**',
  },
  plugins: [
    image(),
    // Allow json resolution
    json(),
    postcss({
      extensions: ['.css'],
      plugins: [simplevars(), nested(), postcssPresetEnv(), cssnano()],
    }),
    // Compile TypeScript files
    typescript({
      rollupCommonJSResolveHack: true,
      typescript: require('typescript'),
    }),
    // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
    commonjs({
      namedExports: {
        'node_modules/leaflet/dist/leaflet-src.js': [
          'Marker',
          'icon',
        ],
      }
    }),
    // Allow node_modules resolution, so you can use 'external' to control
    // which external modules to include in the bundle
    // https://github.com/rollup/rollup-plugin-node-resolve#usage
    resolve({
      customResolveOptions: {
        moduleDirectory: 'node_modules',
      },
    }),
    // Resolve source maps to the original source
    sourceMaps(),
    // minifies generated bundles
    production && terser({ sourcemap: true }),
  ],
};