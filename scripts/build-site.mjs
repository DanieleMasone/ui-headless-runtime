import { access, cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { assertInsideWorkspace, basePath, root } from './shared.mjs';

const site = await assertInsideWorkspace(resolve(root, 'site-dist'));
await rm(site, { recursive: true, force: true });
await mkdir(site, { recursive: true });

const sources = [
  ['apps/demo/dist', '.'],
  ['docs-dist/api', 'api'],
  ['coverage', 'coverage'],
  ['docs', 'docs'],
];

for (const [source, destination] of sources) {
  const sourcePath = await assertInsideWorkspace(resolve(root, source));
  await access(sourcePath);
  await cp(sourcePath, resolve(site, destination), { recursive: true });
}

await cp(resolve(site, 'index.html'), resolve(site, '404.html'));
await writeFile(resolve(site, '.nojekyll'), '');

const docsRoot = resolve(root, 'docs');
const documentationFiles = [];
const collectDocumentation = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await collectDocumentation(path);
    else if (entry.name.endsWith('.md')) documentationFiles.push(relative(docsRoot, path));
  }
};
await collectDocumentation(docsRoot);
documentationFiles.sort((left, right) => left.localeCompare(right));
const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const docsIndex = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Technical documentation · UI Headless Runtime</title></head><body><main><h1>Technical documentation</h1><p>Reviewed Markdown sources shipped in the same verified Pages artifact.</p><ul>${documentationFiles
  .map((file) => {
    const url = file.split(sep).map(encodeURIComponent).join('/');
    return `<li><a href="${basePath}docs/${url}">${escapeHtml(file)}</a></li>`;
  })
  .join(
    '',
  )}</ul><p><a href="${basePath}">Return to the interactive laboratory</a></p></main></body></html>`;
await writeFile(resolve(site, 'docs', 'index.html'), docsIndex);

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
