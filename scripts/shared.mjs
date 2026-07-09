import { readFile, realpath } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteBasePath } from '../metadata/site.ts';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const packageMetadata = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const repositoryUrl = packageMetadata.repository.url;
export const repositoryName =
  process.env.SITE_REPOSITORY ??
  repositoryUrl
    .replace(/\.git$/u, '')
    .split('/')
    .at(-1);
export const basePath = siteBasePath;

export async function assertInsideWorkspace(path) {
  const resolvedRoot = await realpath(root);
  const resolved = resolve(path);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${sep}`)) {
    throw new Error(`Refusing path outside workspace: ${resolved}`);
  }
  return resolved;
}

export function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    import('node:child_process').then(({ spawn }) => {
      const useNpmEntrypoint = command === 'npm' && process.env.npm_execpath;
      const executable = useNpmEntrypoint ? process.execPath : command;
      const commandArguments = useNpmEntrypoint ? [process.env.npm_execpath, ...args] : args;
      const child = spawn(executable, commandArguments, {
        cwd: root,
        stdio: 'inherit',
        shell: false,
        ...options,
      });
      child.on('error', reject);
      child.on('exit', (code) => {
        if (code === 0) resolvePromise();
        else reject(new Error(`${command} exited with code ${String(code)}`));
      });
    }, reject);
  });
}
