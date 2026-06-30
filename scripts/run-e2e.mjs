import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const playwrightCli = fileURLToPath(import.meta.resolve('@playwright/test/cli'));
const forwardedArguments = process.argv.slice(2);

for (const project of ['chromium', 'firefox', 'webkit']) {
  const result = spawnSync(
    process.execPath,
    [
      playwrightCli,
      'test',
      'tests/e2e',
      `--project=${project}`,
      ...(project === 'firefox' ? ['--workers=1'] : []),
      ...forwardedArguments,
    ],
    { cwd: process.cwd(), env: process.env, stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
