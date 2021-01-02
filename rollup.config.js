import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import css from 'rollup-plugin-css-only';
import copy from 'rollup-plugin-copy';

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
          { src: 'src/*.{html,png,svg,json}', dest: 'public' },
          { src: 'node_modules/codemirror/lib/*.css', dest: 'public/vendor/codemirror/lib' }
        ]
      }),

      resolve({
        browser: true,
        dedupe: ['svelte']
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
      production && terser()
    ]
  },
  {
    input: 'node_modules/codemirror/mode/javascript/javascript.js',
    output: {
      sourcemap: !production,
      format: 'iife',
      file: 'public/vendor/codemirror/mode/javascript/javascript.js'
    },
    plugins: [
      production && terser()
    ]
  },
  {
    input: 'node_modules/codemirror/lib/codemirror.js',
    output: {
      sourcemap: !production,
      format: 'umd',
      name: 'CodeMirror',
      file: 'public/vendor/codemirror/lib/codemirror.js'
    },
    plugins: [
      commonjs(),
      production && terser()
    ]
  },
  {
    input: 'node_modules/feelin/dist/feelin.umd.js',
    output: {
      sourcemap: !production,
      format: 'umd',
      name: 'Feelin',
      file: 'public/vendor/feelin/dist/feelin.umd.js'
    },
    plugins: [
      commonjs(),
      production && terser()
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
      server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
        stdio: ['ignore', 'inherit', 'inherit'],
        shell: true
      });

      process.on('SIGTERM', toExit);
      process.on('exit', toExit);
    }
  };
}