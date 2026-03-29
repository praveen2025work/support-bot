import { build } from 'esbuild';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  'fs', 'path', 'http', 'https', 'url', 'stream', 'os', 'crypto', 'util',
  'child_process', 'events', 'net', 'tls', 'zlib', 'buffer', 'querystring',
  'assert', 'worker_threads',
];

await build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'dist/server.js',
  sourcemap: true,
  minify: false,
  treeShaking: true,
  external,
  alias: { '@': './src' },
  loader: { '.json': 'json' },
  logLevel: 'info',
});
