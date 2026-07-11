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
  'docs/guide/index.html',
  'docs/guide/getting-started.html',
  'docs/guide/accessibility.html',
  'docs/guide/framework-integration.html',
  'docs/guide/frameworks/react.html',
  'docs/guide/frameworks/vue.html',
  'docs/guide/frameworks/angular.html',
  'docs/accessibility/demo-conformance.html',
  'docs/components/dialog.html',
  'docs/components/combobox.html',
  'docs/architecture/overview.html',
];
for (const file of required) await access(resolve(site, file));

const index = await readFile(resolve(site, 'index.html'), 'utf8');
if (!index.includes(basePath))
  throw new Error(`Demo index does not reference Pages base ${basePath}`);
if (
  /https?:\/\/(?:localhost|127\.0\.0\.1)|(?:href|src)=["'](?:\/\/)?(?:localhost|127\.0\.0\.1)|(?:href|src)=["']file:|(?:href|src)=["'][A-Za-z]:[\\/]|packages\/ui-headless-runtime\/src/u.test(
    index,
  )
) {
  throw new Error('Production index leaks a local or source-only path.');
}

const conformance = await readFile(
  resolve(site, 'docs', 'accessibility', 'demo-conformance.html'),
  'utf8',
);
if (!conformance.includes('Demo and documentation accessibility conformance')) {
  throw new Error('Generated accessibility conformance page has the wrong title.');
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
      const extension = extname(path);
      if (extension === '.html' || extension === '.js') {
        const html = await readFile(path, 'utf8');
        if (
          /https?:\/\/(?:localhost|127\.0\.0\.1)|(?:href|src)=["'](?:\/\/)?(?:localhost|127\.0\.0\.1)/u.test(
            html,
          )
        )
          throw new Error(`Localhost reference in ${path}`);
        if (
          /(?:href|src)=["']file:|(?:href|src)=["'][A-Za-z]:[\\/]|(?:href|src)=["'](?!(?:https?:)?\/\/)[^"']*(?:apps|packages|metadata|scripts|tests)[\\/]/u.test(
            html,
          )
        ) {
          throw new Error(`Workspace source path in public artifact: ${path}`);
        }
        if (/href="[^"]+\.md(?:[?#"])/u.test(html))
          throw new Error(`Raw Markdown link in generated HTML: ${path}`);
        if (extension === '.js' && /docs\/[^'"`]+\.md(?:['"`?#)]|$)/u.test(html)) {
          throw new Error(`Demo bundle contains a Markdown documentation route: ${path}`);
        }
      }
      if (extension === '.html') {
        const html = await readFile(path, 'utf8');
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
