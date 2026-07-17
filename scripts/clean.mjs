import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertInsideWorkspace, root } from './shared.mjs';

const outputs = [
  'coverage',
  'docs-dist',
  'docs/.vitepress/cache',
  'docs/.vitepress/dist',
  'docs/.vitepress/.temp',
  'site-dist',
  'release-tarball',
  'playwright-report',
  'test-results',
  '.vitest-attachments',
  'tests/browser/__screenshots__',
  '.tmp',
  'apps/demo/dist',
  'packages/ui-headless-runtime/dist',
  'packages/ui-headless-runtime/temp',
];

for (const output of outputs) {
  const target = await assertInsideWorkspace(resolve(root, output));
  await rm(target, { recursive: true, force: true });
}
