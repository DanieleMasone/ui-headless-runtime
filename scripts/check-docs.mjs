import { access, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { componentCatalog } from '../metadata/components.ts';
import { root } from './shared.mjs';

const output = resolve(root, 'docs-dist', 'site');
await access(resolve(output, 'index.html'));

for (const component of componentCatalog) {
  await access(resolve(output, 'components', `${component.id}.html`));
}

for (const component of componentCatalog) {
  await access(resolve(root, 'apps', 'demo', 'src', 'examples', `${component.id}.ts`));
}

const files = [];
const walk = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else files.push(path);
  }
};
await walk(output);

for (const path of files.filter((file) => file.endsWith('.html'))) {
  const html = await readFile(path, 'utf8');
  if (/localhost|127\.0\.0\.1|href="[^"]+\.md(?:[?#"])/u.test(html)) {
    throw new Error(`Generated documentation contains a development or raw-source link: ${path}`);
  }
}

console.log(`Static documentation checks passed for ${files.length} generated files.`);
