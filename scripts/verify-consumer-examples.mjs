import { access, readFile, readdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { assertInsideWorkspace, root, run } from './shared.mjs';

const examplesRoot = await assertInsideWorkspace(resolve(root, 'examples', 'consumers'));
const expectedExamples = ['angular-standalone', 'react-vite', 'vue-vite'];
const dependencySections = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];
const sourceExtensions = new Set(['.js', '.mjs', '.ts', '.tsx', '.vue']);
const npmEnvironment = {
  ...process.env,
  npm_config_cache: resolve(root, '.tmp', 'consumer-examples-npm-cache'),
};

const entries = await readdir(examplesRoot, { withFileTypes: true });
const exampleNames = entries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
if (JSON.stringify(exampleNames) !== JSON.stringify(expectedExamples)) {
  throw new Error(`Expected standalone consumers: ${expectedExamples.join(', ')}.`);
}

const rootManifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
if (JSON.stringify(rootManifest.workspaces).includes('examples')) {
  throw new Error('Consumer examples must remain outside the root npm workspaces.');
}

async function collectSourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.angular')
      continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectSourceFiles(path)));
    else if (sourceExtensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

function verifyDependencySpecs(manifest, exampleName) {
  if (manifest.private !== true) throw new Error(`${exampleName} must be private.`);
  if (manifest.dependencies?.['ui-headless-runtime'] !== '^1.0.0') {
    throw new Error(`${exampleName} must depend on ui-headless-runtime using ^1.0.0.`);
  }
  for (const section of dependencySections) {
    for (const [name, specification] of Object.entries(manifest[section] ?? {})) {
      if (typeof specification === 'string' && /^(?:file|workspace):/u.test(specification)) {
        throw new Error(`${exampleName} uses forbidden ${specification} dependency ${name}.`);
      }
    }
  }
}

function verifyImportSpecifier(specifier, file) {
  const normalized = specifier.replaceAll('\\', '/');
  if (normalized.startsWith('ui-headless-runtime/')) {
    throw new Error(`Deep runtime import ${specifier} in ${file}.`);
  }
  if (/(?:^|\/)packages(?:\/|$)/u.test(normalized)) {
    throw new Error(`Repository package import ${specifier} in ${file}.`);
  }
}

for (const exampleName of exampleNames) {
  const directory = await assertInsideWorkspace(resolve(examplesRoot, exampleName));
  const manifestPath = resolve(directory, 'package.json');
  const lockPath = resolve(directory, 'package-lock.json');
  await access(lockPath);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  verifyDependencySpecs(manifest, exampleName);

  const lock = JSON.parse(await readFile(lockPath, 'utf8'));
  const lockedRuntime = lock.packages?.['node_modules/ui-headless-runtime'];
  if (
    lockedRuntime?.link === true ||
    typeof lockedRuntime?.resolved !== 'string' ||
    !lockedRuntime.resolved.startsWith('https://registry.npmjs.org/ui-headless-runtime/')
  ) {
    throw new Error(`${exampleName} must lock ui-headless-runtime from the npm registry.`);
  }

  for (const file of await collectSourceFiles(directory)) {
    const source = await readFile(file, 'utf8');
    const importPattern = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"]([^'"]+)['"]/gu;
    for (const match of source.matchAll(importPattern)) verifyImportSpecifier(match[1], file);
  }

  console.log(`Verifying ${exampleName} against the published npm package...`);
  await run('npm', ['ci', '--no-audit', '--no-fund'], { cwd: directory, env: npmEnvironment });
  await run('npm', ['run', 'typecheck'], { cwd: directory, env: npmEnvironment });
  await run('npm', ['run', 'build'], { cwd: directory, env: npmEnvironment });
}

console.log('All standalone framework consumer examples passed.');
