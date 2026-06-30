import { access, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { basePath, root } from './shared.mjs';

const site = resolve(root, 'site-dist');
const required = [
  'index.html',
  '404.html',
  '.nojekyll',
  'api/index.html',
  'coverage/index.html',
  'docs/index.html',
];
for (const file of required) await access(resolve(site, file));

const index = await readFile(resolve(site, 'index.html'), 'utf8');
if (!index.includes(basePath))
  throw new Error(`Demo index does not reference Pages base ${basePath}`);
if (/localhost|127\.0\.0\.1|packages\/ui-headless-runtime\/src/u.test(index)) {
  throw new Error('Production index leaks a local or source-only path.');
}

const references = [...index.matchAll(/(?:src|href)="([^"]+)"/gu)].map((match) => match[1]);
for (const reference of references) {
  if (/^(?:https?:|#|mailto:)/u.test(reference)) continue;
  const normalized = reference.startsWith(basePath)
    ? reference.slice(basePath.length)
    : reference.replace(/^\//u, '');
  const file = resolve(site, normalized.split(/[?#]/u)[0]);
  await access(file);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else {
      const details = await stat(path);
      if (details.size > 15 * 1024 * 1024) throw new Error(`Unexpectedly large site file: ${path}`);
      if (extname(path) === '.html') {
        const html = await readFile(path, 'utf8');
        if (/localhost|127\.0\.0\.1/u.test(html)) throw new Error(`Localhost reference in ${path}`);
        const links = [...html.matchAll(/(?:src|href)="([^"]+)"/gu)].map((match) => match[1]);
        for (const link of links) {
          if (/^(?:https?:|mailto:|data:|javascript:|#)/u.test(link)) continue;
          const clean = decodeURIComponent(link.split(/[?#]/u)[0]);
          let target = clean.startsWith(basePath)
            ? resolve(site, clean.slice(basePath.length))
            : resolve(dirname(path), clean);
          if (target !== site && !target.startsWith(`${site}${sep}`)) {
            throw new Error(`Site link escapes the artifact: ${path} -> ${link}`);
          }
          try {
            if ((await stat(target)).isDirectory()) target = resolve(target, 'index.html');
            await access(target);
          } catch {
            throw new Error(`Broken local site link: ${path} -> ${link}`);
          }
        }
      }
    }
  }
}

await walk(site);
console.log(`Static site checks passed for ${basePath}`);
