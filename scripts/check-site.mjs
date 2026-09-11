import { access, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { forbiddenPublicSiteRoots, requiredPublicSitePaths } from './public-site-paths.mjs';
import { basePath, root } from './shared.mjs';

const site = resolve(root, 'site-dist');
const readme = await readFile(resolve(root, 'README.md'), 'utf8');
await access(resolve(root, '.github', 'workflows', 'ci.yml'));

const expectedReadmeBadges = [
  '[![CI](https://github.com/DanieleMasone/ui-headless-runtime/actions/workflows/ci.yml/badge.svg)](https://github.com/DanieleMasone/ui-headless-runtime/actions/workflows/ci.yml)',
  '[![npm version](https://img.shields.io/npm/v/ui-headless-runtime)](https://www.npmjs.com/package/ui-headless-runtime)',
  '[![Lines coverage](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdanielemasone.github.io%2Fui-headless-runtime%2Fcoverage%2Fcoverage-summary.json&query=%24.total.lines.pct&suffix=%25&label=lines%20coverage)](https://danielemasone.github.io/ui-headless-runtime/coverage/)',
  '[![Live documentation](https://img.shields.io/website?url=https%3A%2F%2Fdanielemasone.github.io%2Fui-headless-runtime%2F&label=GitHub%20Pages)](https://danielemasone.github.io/ui-headless-runtime/)',
];
let previousBadgeIndex = -1;
for (const badge of expectedReadmeBadges) {
  const badgeIndex = readme.indexOf(badge);
  if (badgeIndex === -1) throw new Error(`README is missing the required dynamic badge: ${badge}`);
  if (badgeIndex <= previousBadgeIndex)
    throw new Error('README badges are not in canonical order.');
  previousBadgeIndex = badgeIndex;
}

const forbiddenReadmeBadges = [
  /img\.shields\.io\/badge\/typescript-/iu,
  /img\.shields\.io\/badge\/runtime(?:%20|[ _-])dependencies-/iu,
  /img\.shields\.io\/badge\/demo(?:%20|[ _-])a11y-/iu,
  /img\.shields\.io\/badge\/(?:lines(?:%20|[ _-]))?coverage-/iu,
];
for (const badgePattern of forbiddenReadmeBadges) {
  if (badgePattern.test(readme))
    throw new Error(`README contains a stale-prone badge: ${badgePattern}`);
}

const canonicalRepository = 'DanieleMasone/ui-headless-runtime';
for (const match of readme.matchAll(/https:\/\/github\.com\/([^/\s)]+)\/([^/\s)#]+)/gu)) {
  const [, owner, repository] = match;
  if (
    repository?.toLowerCase() === 'ui-headless-runtime' &&
    `${owner}/${repository}` !== canonicalRepository
  ) {
    throw new Error(`README uses non-canonical repository casing: ${owner}/${repository}`);
  }
}

for (const file of requiredPublicSitePaths) await access(resolve(site, file));

const coverageSummary = JSON.parse(
  await readFile(resolve(site, 'coverage', 'coverage-summary.json'), 'utf8'),
);
const linesCoverage = coverageSummary?.total?.lines?.pct;
if (typeof linesCoverage !== 'number' || !Number.isFinite(linesCoverage)) {
  throw new Error('Published coverage summary does not expose a numeric total.lines.pct value.');
}

const publicRoots = new Set(
  (await readdir(site, { withFileTypes: true })).map((entry) => entry.name),
);
for (const forbidden of forbiddenPublicSiteRoots) {
  if (publicRoots.has(forbidden)) {
    throw new Error(`Repository-only content entered the public artifact: ${forbidden}`);
  }
}

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
