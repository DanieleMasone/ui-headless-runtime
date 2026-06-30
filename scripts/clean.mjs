import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertInsideWorkspace, root } from './shared.mjs';

const outputs = [
  'coverage',
  'docs-dist',
  'site-dist',
  'playwright-report',
  'test-results',
  '.tmp',
  'apps/demo/dist',
  'packages/ui-headless-runtime/dist',
  'packages/ui-headless-runtime/temp',
];

for (const output of outputs) {
  const target = await assertInsideWorkspace(resolve(root, output));
  await rm(target, { recursive: true, force: true });
}
