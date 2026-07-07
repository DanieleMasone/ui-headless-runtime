import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root } from './shared.mjs';

const metadata = JSON.parse(
  await readFile(resolve(root, 'packages', 'ui-headless-runtime', 'package.json'), 'utf8'),
);
const specification = `${metadata.name}@${metadata.version}`;

const result = await new Promise((resolveResult, reject) => {
  const child = spawn('npm', ['view', specification, 'version', '--json'], {
    cwd: root,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => (stdout += String(chunk)));
  child.stderr.on('data', (chunk) => (stderr += String(chunk)));
  child.on('error', reject);
  child.on('exit', (code) => resolveResult({ code, stdout, stderr }));
});

if (result.code === 0) {
  throw new Error(`${specification} already exists on npm.`);
}

const failure = `${result.stdout}\n${result.stderr}`;
if (!/(?:E404|404 Not Found)/u.test(failure)) {
  throw new Error(`Could not establish npm version availability for ${specification}:\n${failure}`);
}

console.log(`${specification} is not present on npm and may be published.`);
