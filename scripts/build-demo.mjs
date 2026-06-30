import { basePath, run } from './shared.mjs';

await run('npm', ['run', 'build', '--workspace', '@ui-headless-runtime/demo'], {
  env: { ...process.env, BASE_PATH: basePath },
});
