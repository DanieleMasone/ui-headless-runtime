import { createRequire } from 'node:module';
import { access, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { Script, createContext } from 'node:vm';
import { gunzipSync } from 'node:zlib';
import { assertInsideWorkspace, root, run } from './shared.mjs';

const temporary = await assertInsideWorkspace(resolve(root, '.tmp', 'package-check'));
await rm(temporary, { recursive: true, force: true });
await mkdir(temporary, { recursive: true });
const packageDirectory = resolve(root, 'packages', 'ui-headless-runtime');
const runtimeDependencySections = [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
  'bundleDependencies',
  'bundledDependencies',
];
const internalRuntimeExports = [
  'createCollection',
  'createControllableValue',
  'createDisposableScope',
  'createEventEmitter',
  'createRuntimeId',
  'createTimeoutManager',
  'eventTargets',
  'findTypeaheadMatch',
  'focusById',
  'focusInitial',
  'fuzzyScore',
  'getOwnerDocument',
  'getOwnerWindow',
  'getScrollableAncestors',
  'getTabbableElements',
  'inertSiblings',
  'listen',
  'lockDocumentScroll',
  'normalizeText',
  'observeOutsideInteraction',
  'restoreFocus',
  'trapFocus',
];
const assertNoRuntimeDependencies = (manifest, location) => {
  for (const section of runtimeDependencySections) {
    const declared = manifest[section] ?? {};
    const dependencies = Array.isArray(declared) ? declared : Object.keys(declared);
    for (const dependency of dependencies) {
      throw new Error(`${location} declares runtime dependency ${dependency} in ${section}.`);
    }
  }
};

const packageManifest = JSON.parse(
  await readFile(resolve(packageDirectory, 'package.json'), 'utf8'),
);
assertNoRuntimeDependencies(packageManifest, 'Publishable package');
const npmEnvironment = {
  ...process.env,
  npm_config_cache: resolve(temporary, 'npm-cache'),
};

const listTarballEntries = (tarballBuffer) => {
  const archive = gunzipSync(tarballBuffer);
  const entries = [];
  let offset = 0;
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    const name = header.toString('utf8', 0, 100).replace(/\0.*$/u, '');
    if (!name) break;
    const prefix = header.toString('utf8', 345, 500).replace(/\0.*$/u, '');
    const sizeText = header.toString('utf8', 124, 136).replace(/\0.*$/u, '').trim();
    const size = Number.parseInt(sizeText || '0', 8);
    const path = prefix ? `${prefix}/${name}` : name;
    if (!path.endsWith('/')) entries.push(path);
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return entries;
};

const providedTarball = process.argv[2];
let tarball;
if (providedTarball) {
  tarball = await assertInsideWorkspace(resolve(providedTarball));
  await access(tarball);
} else {
  await run('npm', ['pack', '--json', '--pack-destination', temporary], {
    cwd: packageDirectory,
    env: npmEnvironment,
  });
  const tarballs = (await readdir(temporary)).filter((file) => file.endsWith('.tgz'));
  if (tarballs.length !== 1) throw new Error('Package check expected exactly one tarball.');
  tarball = resolve(temporary, tarballs[0]);
}

const tarballEntries = listTarballEntries(await readFile(tarball)).map((entry) =>
  entry.replace(/^package\//u, ''),
);
for (const entry of tarballEntries) {
  if (/\.css$/iu.test(entry)) {
    throw new Error(`Runtime CSS leaked into the tarball: ${entry}`);
  }
  if (/(?:^|\/)(?:apps|docs|examples)(?:\/|$)/u.test(entry)) {
    throw new Error(`Framework documentation or example leaked into the tarball: ${entry}`);
  }
  if (!/^(?:dist\/|README\.md$|LICENSE$|package\.json$)/u.test(entry)) {
    throw new Error(`Unexpected tarball entry: ${entry}`);
  }
}

const consumer = resolve(temporary, 'consumer');
await mkdir(consumer, { recursive: true });
await writeFile(
  resolve(consumer, 'package.json'),
  JSON.stringify({ name: 'package-consumer', private: true, type: 'module' }),
);
await run('npm', ['install', '--ignore-scripts', tarball], {
  cwd: consumer,
  env: npmEnvironment,
});

const installed = resolve(consumer, 'node_modules', 'ui-headless-runtime');
const installedManifest = JSON.parse(await readFile(resolve(installed, 'package.json'), 'utf8'));
assertNoRuntimeDependencies(installedManifest, 'Installed package');
const esmSmoke = resolve(consumer, 'esm-smoke.mjs');
await writeFile(
  esmSmoke,
  `import * as runtime from 'ui-headless-runtime';\nconst internalExports = ${JSON.stringify(internalRuntimeExports)};\nfor (const name of internalExports) { if (name in runtime) throw new Error(\`Internal export leaked: \${name}\`); }\nif (runtime.hasDOM()) throw new Error('SSR import unexpectedly detected a DOM.');\nconst dialog = runtime.createDialog();\nif (dialog.getSnapshot().open) throw new Error('Unexpected Dialog default.');\ndialog.destroy();\n`,
);
await run(process.execPath, [esmSmoke], { cwd: consumer });
const require = createRequire(resolve(consumer, 'consumer.cjs'));
const cjs = require('ui-headless-runtime');
if (typeof cjs.createTabs !== 'function') throw new Error('CJS public export is unavailable.');
for (const name of internalRuntimeExports) {
  if (name in cjs) throw new Error(`CJS internal export leaked: ${name}`);
}
try {
  require('ui-headless-runtime/src/index');
  throw new Error('A deep package import unexpectedly resolved.');
} catch (error) {
  if (error instanceof Error && error.message.includes('unexpectedly')) throw error;
}

const sandbox = {};
createContext(sandbox);
new Script(
  await readFile(resolve(installed, 'dist', 'ui-headless-runtime.iife.js'), 'utf8'),
).runInContext(sandbox);
if (typeof sandbox.UIHeadlessRuntime?.createPopover !== 'function')
  throw new Error('IIFE global is unavailable.');
for (const name of internalRuntimeExports) {
  if (name in sandbox.UIHeadlessRuntime) throw new Error(`IIFE internal export leaked: ${name}`);
}

const consumerSource = `import { createDialog, type DialogSnapshot, type FloatingPositionOptions, type RuntimeEventListener, type RuntimeEventSource } from 'ui-headless-runtime';\ntype Events = { change: { value: number } };\nconst listener: RuntimeEventListener<Events['change']> = (event) => console.log(event.detail.value);\nconst source = null as RuntimeEventSource<Events> | null;\nconst positioning = { placement: 'bottom-start' } satisfies FloatingPositionOptions;\nvoid listener;\nvoid source;\nvoid positioning;\nconst dialog = createDialog();\nconst snapshot: Readonly<DialogSnapshot> = dialog.getSnapshot();\nconsole.log(snapshot.open);\ndialog.destroy();\n`;
await writeFile(resolve(consumer, 'index.ts'), consumerSource);
await run(
  process.execPath,
  [
    resolve(root, 'node_modules', 'typescript', 'bin', 'tsc'),
    '--ignoreConfig',
    '--noEmit',
    '--strict',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
    '--target',
    'ES2022',
    resolve(consumer, 'index.ts'),
  ],
  { cwd: consumer },
);

const treeShakeEntry = resolve(consumer, 'tree-shake.ts');
await writeFile(
  treeShakeEntry,
  `import { createDisclosure } from 'ui-headless-runtime';\nconsole.log(createDisclosure);\n`,
);
const { build } = await import('vite');
const treeShakeOutput = resolve(consumer, 'tree-shake-dist');
await build({
  root: consumer,
  logLevel: 'silent',
  build: {
    outDir: treeShakeOutput,
    emptyOutDir: true,
    minify: false,
    rollupOptions: { input: treeShakeEntry },
  },
});
const treeShakeFiles = await readdir(resolve(treeShakeOutput, 'assets'));
const treeShakeJavaScript = treeShakeFiles.find((file) => file.endsWith('.js'));
if (!treeShakeJavaScript) throw new Error('Tree-shaken consumer did not emit JavaScript.');
const treeShakeBundle = await readFile(
  resolve(treeShakeOutput, 'assets', treeShakeJavaScript),
  'utf8',
);
if (/create(?:Dialog|Toast|Combobox|TreeView)/u.test(treeShakeBundle)) {
  throw new Error('Tree-shaken consumer retained unrelated component factories.');
}

const deepImport = resolve(installed, 'src');
try {
  await access(deepImport);
  throw new Error('Source directory leaked into the tarball.');
} catch (error) {
  if (error instanceof Error && error.message.includes('leaked')) throw error;
}

console.log(`Package smoke test passed: ${tarball.split(sep).at(-1)}`);
