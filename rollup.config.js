/* eslint-env node */

import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import css from 'rollup-plugin-css-only';
import copy from 'rollup-plugin-copy';
import opener from 'opener';

const production = !process.env.ROLLUP_WATCH;

export default [
  {
    input: 'src/main.js',
    output: {
      sourcemap: !production,
      format: 'iife',
      name: 'app',
      file: 'public/bundle.js'
    },
    plugins: [
      svelte({
        compilerOptions: {

          // enable run-time checks when not in production
          dev: !production
        }
      }),

      // we'll extract any component CSS out into
      // a separate file - better for performance
      css({ output: 'bundle.css' }),

      copy({
        targets: [
          { src: 'src/*.{html,png,svg,json}', dest: 'public' }
        ]
      }),

      resolve({
        browser: true,
        dedupe: [ 'svelte', '@codemirror/state' ]
      }),
      commonjs(),

      // In dev mode, call `npm run start` once
      // the bundle has been generated
      !production && serve(),

      // Watch the `public` directory and refresh the
      // browser on changes when not in production
      !production && livereload('public'),

      // If we're building for production (npm run build
      // instead of npm run dev), minify
      production && terser(),

      // In dev mode, open browser once
      // the bundle has been generated
      !production && open()
    ]
  },
  {
    input: 'src/service-worker.js',
    output: {
      sourcemap: !production,
      format: 'iife',
      name: 'appWorker',
      file: 'public/service-worker.js'
    },
    plugins: [
      production && terser()
    ]
  }
];

function serve() {
  let server;

  function toExit() {
    if (server) server.kill(0);
  }

  return {
    writeBundle() {
      if (server) return;
      server = require('child_process').spawn('npm', [ 'run', 'start', '--', '--dev' ], {
        stdio: [ 'ignore', 'inherit', 'inherit' ],
        shell: true
      });

      process.on('SIGTERM', toExit);
      process.on('exit', toExit);
    }
  };
}

function open() {
  let opened;

  return {
    writeBundle() {
      if (opened) return;

      opened = opener('http://localhost:8080');
    }
  };
}