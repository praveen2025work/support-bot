import { build } from 'esbuild';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// Mark all dependencies as external — they stay in node_modules.
// esbuild bundles only our source code (resolves path aliases, tree-shakes dead code,
// and produces a single output file), making startup 5-10x faster.
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  // Node built-ins
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
  minify: false,       // Keep readable for debugging; ~10% larger but faster builds
  treeShaking: true,
  external,
  // Resolve @/* path alias (matches tsconfig.json paths)
  alias: {
    '@': './src',
  },
  // Handle JSON imports (corpus.json, groups.json, etc.)
  loader: {
    '.json': 'json',
  },
  logLevel: 'info',
});
