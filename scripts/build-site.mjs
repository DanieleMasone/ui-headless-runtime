import { access, cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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

const walkHtml = async (directory, files = []) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walkHtml(path, files);
    else if (entry.name.endsWith('.html')) files.push(path);
  }
  return files;
};

const injectStyle = async (directory, id, css) => {
  for (const file of await walkHtml(directory)) {
    const html = await readFile(file, 'utf8');
    if (html.includes(`id="${id}"`)) continue;
    await writeFile(file, html.replace('</head>', `<style id="${id}">${css}</style></head>`));
  }
};

await injectStyle(
  resolve(site, 'coverage'),
  'uhr-coverage-overflow-fix',
  'html,body,.wrapper{max-width:100%}.pad1{max-width:100%;box-sizing:border-box;overflow-x:auto}.coverage-summary{min-width:56rem}pre{max-width:100%;overflow-x:auto}',
);

await cp(resolve(site, 'index.html'), resolve(site, '404.html'));
await writeFile(resolve(site, '.nojekyll'), '');

for (const required of [
  'index.html',
  '404.html',
  '.nojekyll',
  'api/index.html',
  'coverage/index.html',
  'docs/index.html',
  'docs/guide/accessibility.html',
  'docs/accessibility/demo-conformance.html',
  'docs/components/dialog.html',
  'docs/components/combobox.html',
  'docs/architecture/overview.html',
]) {
  await access(resolve(site, required));
}

console.log(`Composed verified Pages artifact at ${site} with base ${basePath}`);
