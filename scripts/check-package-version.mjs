import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root } from './shared.mjs';

const readJson = async (...segments) =>
  JSON.parse(await readFile(resolve(root, ...segments), 'utf8'));
const rootMetadata = await readJson('package.json');
const demoMetadata = await readJson('apps', 'demo', 'package.json');
const metadata = await readJson('packages', 'ui-headless-runtime', 'package.json');
const lockfile = await readJson('package-lock.json');
const expectedVersion = metadata.version;
const versionLocations = new Map([
  ['root package', rootMetadata.version],
  ['demo package', demoMetadata.version],
  ['lockfile root', lockfile.version],
  ['lockfile root workspace', lockfile.packages?.['']?.version],
  ['lockfile demo workspace', lockfile.packages?.['apps/demo']?.version],
  ['lockfile publishable workspace', lockfile.packages?.['packages/ui-headless-runtime']?.version],
]);

for (const [location, version] of versionLocations) {
  if (version !== expectedVersion) {
    throw new Error(
      `Release version mismatch: ${location} is ${String(version)}, expected ${expectedVersion}.`,
    );
  }
}

const changelog = await readFile(resolve(root, 'CHANGELOG.md'), 'utf8');
const unreleased = /^## Unreleased\s*([\s\S]*?)(?=^## \[)/mu.exec(changelog)?.[1]?.trim();
if (unreleased) {
  throw new Error(
    'CHANGELOG.md still contains unreleased entries; finalize them before publishing.',
  );
}
const escapedVersion = expectedVersion.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
if (!new RegExp(`^## \\[${escapedVersion}\\] - \\d{4}-\\d{2}-\\d{2}$`, 'mu').test(changelog)) {
  throw new Error(`CHANGELOG.md does not contain a dated ${expectedVersion} release entry.`);
}

const specification = `${metadata.name}@${metadata.version}`;
const registryUrl = new URL(
  `${encodeURIComponent(metadata.name)}/${encodeURIComponent(metadata.version)}`,
  'https://registry.npmjs.org/',
);
let response;
try {
  response = await fetch(registryUrl, {
    headers: { accept: 'application/vnd.npm.install-v1+json' },
    signal: AbortSignal.timeout(15_000),
  });
} catch (error) {
  throw new Error(`Could not query npm for ${specification}.`, { cause: error });
}

if (response.ok) {
  throw new Error(`${specification} already exists on npm.`);
}
if (response.status !== 404) {
  throw new Error(
    `Could not establish npm version availability for ${specification}: HTTP ${String(response.status)} ${response.statusText}.`,
  );
}

console.log(`${specification} is not present on npm and may be published.`);
