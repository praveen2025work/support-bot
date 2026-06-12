import { cp, mkdir, rm, stat, writeFile } from 'fs/promises';
import path from 'path';

const root = process.cwd();
const outDir = path.join(root, 'out');

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function copyRequired(from, to) {
  if (!(await exists(from))) {
    throw new Error(`Required build artifact is missing: ${path.relative(root, from)}`);
  }
  await cp(from, to, { recursive: true });
}

async function copyOptional(from, to) {
  if (await exists(from)) {
    await cp(from, to, { recursive: true });
  }
}

async function copyService(serviceDir) {
  const serviceRoot = path.join(root, serviceDir);
  const serviceOut = path.join(outDir, serviceDir);

  await mkdir(serviceOut, { recursive: true });
  await copyRequired(path.join(serviceRoot, 'dist'), path.join(serviceOut, 'dist'));
  await copyRequired(path.join(serviceRoot, 'package.json'), path.join(serviceOut, 'package.json'));
  await copyOptional(path.join(serviceRoot, 'package-lock.json'), path.join(serviceOut, 'package-lock.json'));
  await copyOptional(path.join(serviceRoot, 'data'), path.join(serviceOut, 'data'));
}

await rm(outDir, { recursive: true, force: true });
await mkdir(path.join(outDir, 'ui', '.next'), { recursive: true });

await copyRequired(path.join(root, 'apps/web/.next', 'standalone'), path.join(outDir, 'ui'));
await copyRequired(path.join(root, 'apps/web/.next', 'static'), path.join(outDir, 'ui', '.next', 'static'));
await copyOptional(path.join(root, 'apps/web/public'), path.join(outDir, 'ui', 'public'));
await copyOptional(path.join(root, 'apps/web/data'), path.join(outDir, 'ui', 'data'));

await copyService('apps/engine');
await copyService('apps/mssql-connector');
await copyService('apps/oracle-connector');
await copyService('apps/csv-xlsx-connector');

const manifest = {
  generatedAt: new Date().toISOString(),
  ui: {
    runtime: 'next-standalone',
    entrypoint: 'ui/server.js',
  },
  services: {
    engine: 'apps/engine/dist/server.js',
    mssqlConnector: 'apps/mssql-connector/dist/server.js',
    oracleConnector: 'apps/oracle-connector/dist/server.js',
    csvXlsxConnector: 'apps/csv-xlsx-connector/dist/server.js',
  },
};

await writeFile(
  path.join(outDir, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log('Prepared deployable build artifacts in ./out');
