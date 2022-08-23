import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'
import commonjs from '@rollup/plugin-commonjs'

const production = !process.env.ROLLUP_WATCH

export default {
  input: 'client/client.js',
  output: {
    file: '_static/client.min.js',
    format: 'cjs'
  },
  plugins: [
    nodeResolve({browser: true}),
    json(),
    !production && serve({open: true, contentBase: '_static', port: 3000}),
    !production && livereload({watch: '_static'}),
    commonjs()
  ]
}
