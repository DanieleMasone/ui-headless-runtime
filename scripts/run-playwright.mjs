import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { root } from './shared.mjs';
import { siteBasePath } from '../metadata/site.ts';

const baseUrl = `http://127.0.0.1:4173${siteBasePath}`;
let server;

const waitForServer = async () => {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
};

const startServer = async () => {
  server = spawn(process.execPath, ['scripts/serve-site.mjs'], {
    cwd: root,
    stdio: 'ignore',
    windowsHide: true,
  });
  await waitForServer();
};

const stopServer = () => {
  server?.kill();
};

const runPlaywright = () =>
  new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        'node_modules/@playwright/test/cli.js',
        'test',
        '--config=playwright.external.config.ts',
        ...process.argv.slice(2),
      ],
      {
        cwd: root,
        stdio: 'inherit',
        windowsHide: true,
      },
    );
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) reject(new Error(`Playwright exited with signal ${signal}`));
      else resolve(code ?? 1);
    });
  });

try {
  await startServer();
  const code = await runPlaywright();
  stopServer();
  process.exit(code);
} catch (error) {
  stopServer();
  console.error(error);
  process.exit(1);
}
