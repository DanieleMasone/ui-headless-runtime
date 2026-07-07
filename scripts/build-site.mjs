import { access, cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertInsideWorkspace, basePath, root } from './shared.mjs';

const site = await assertInsideWorkspace(resolve(root, 'site-dist'));
await rm(site, { recursive: true, force: true });
await mkdir(site, { recursive: true });

const sources = [
  ['apps/demo/dist', '.'],
  ['docs-dist/api', 'api'],
  ['coverage', 'coverage'],
  ['docs-dist/site', 'docs'],
];

for (const [source, destination] of sources) {
  const sourcePath = await assertInsideWorkspace(resolve(root, source));
  await access(sourcePath);
  await cp(sourcePath, resolve(site, destination), { recursive: true });
}

await cp(resolve(site, 'index.html'), resolve(site, '404.html'));
await writeFile(resolve(site, '.nojekyll'), '');

for (const required of [
  'index.html',
  '404.html',
  '.nojekyll',
  'api/index.html',
  'coverage/index.html',
  'docs/index.html',
]) {
  await access(resolve(site, required));
}

console.log(`Composed verified Pages artifact at ${site} with base ${basePath}`);
