import { access, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { articleRegistry } from '../apps/demo/src/registry/articles.ts';
import { componentCatalog } from '../metadata/components.ts';
import { siteUrl } from '../metadata/site.ts';
import { root } from './shared.mjs';

const output = resolve(root, 'docs-dist', 'site');
await access(resolve(output, 'index.html'));

const requiredGuidePages = [
  'index',
  'getting-started',
  'core-concepts',
  'controllers',
  'rendering-contract',
  'state-management',
  'controlled-vs-uncontrolled',
  'events-and-reasons',
  'dom-binding',
  'accessibility',
  'focus-management',
  'overlays',
  'collections',
  'positioning',
  'ssr',
  'framework-integration',
  'testing',
  'troubleshooting',
  'release-and-package',
];
const frameworkGuides = [
  {
    id: 'react',
    title: 'React integration',
    markers: [
      'createDisclosure',
      'createDialog',
      'useEffect',
      'useSyncExternalStore',
      'getValue',
      'onValueChange',
      'subscribeValue',
      'unsubscribe()',
      'releaseBindingRef.current()',
      'destroy()',
    ],
  },
  {
    id: 'vue',
    title: 'Vue integration',
    markers: [
      'createDisclosure',
      'createDialog',
      'shallowRef',
      'onMounted',
      'onBeforeUnmount',
      'getValue',
      'onValueChange',
      'subscribeValue',
      'releaseBinding()',
      'unsubscribe()',
      'destroy()',
    ],
  },
  {
    id: 'angular',
    title: 'Angular integration',
    markers: [
      'createDisclosure',
      'createDialog',
      'DestroyRef',
      'AfterViewInit',
      'isPlatformBrowser',
      'getValue',
      'onValueChange',
      'subscribeValue',
      'releaseBinding()',
      'unsubscribe()',
      'destroy()',
    ],
  },
];
const requiredFrameworkSections = [
  'Scope',
  'Lifecycle model',
  'Minimal Disclosure example',
  'Dialog example',
  'Controlled state example',
  'CSS',
  'Pitfalls',
];
const frameworkArticles = [
  {
    title: 'Framework integration',
    route: '/guides/framework-integration',
    docsPath: 'guide/framework-integration.html',
  },
  { title: 'React integration', route: '/guides/react', docsPath: 'guide/frameworks/react.html' },
  { title: 'Vue integration', route: '/guides/vue', docsPath: 'guide/frameworks/vue.html' },
  {
    title: 'Angular integration',
    route: '/guides/angular',
    docsPath: 'guide/frameworks/angular.html',
  },
];
const conformanceTitle = '# Demo and documentation accessibility conformance';
const requiredConformanceSections = [
  'Scope',
  'Target',
  'What is covered',
  'What is not guaranteed by the runtime package alone',
  'Automated checks',
  'Manual review checklist',
  'Known limitations',
  'Badge policy',
];

const requiredComponentSections = [
  'Overview',
  'When to use',
  'When not to use',
  'Import',
  'Controller creation',
  'Options',
  'Snapshot',
  'Commands',
  'Events',
  'Change reasons',
  'Controlled mode',
  'Uncontrolled mode',
  'DOM binding',
  'Required markup',
  'ARIA contract',
  'Keyboard interaction',
  'Focus behavior',
  'Nested behavior',
  'Cleanup',
  'Complete example',
  'Edge cases',
  'Limitations',
  'Related links',
  'API reference',
];

for (const component of componentCatalog) {
  const source = await readFile(resolve(root, 'docs', 'components', `${component.id}.md`), 'utf8');
  if (!source.startsWith(`# ${component.name}\n`)) {
    throw new Error(`Component documentation title mismatch: ${component.id}`);
  }
  for (const section of requiredComponentSections) {
    if (!source.includes(`\n## ${section}\n`)) {
      throw new Error(`Component documentation is missing "${section}": ${component.id}`);
    }
  }
  const demoUrl = `${siteUrl}#${component.route}`;
  const apiReferenceUrl = `${siteUrl}${component.apiPath}`;
  if (!source.includes(`[Live demo](${demoUrl})`)) {
    throw new Error(`Component documentation has an invalid live demo link: ${component.id}`);
  }
  if (!source.includes(`](${apiReferenceUrl})`)) {
    throw new Error(`Component documentation has an invalid API reference link: ${component.id}`);
  }

  const generatedPath = resolve(output, 'components', `${component.id}.html`);
  const generated = await readFile(generatedPath, 'utf8');
  if (
    !generated.includes(`href="${demoUrl}"`) ||
    !generated.includes(`href="${apiReferenceUrl}"`)
  ) {
    throw new Error(`Generated component links do not match the public routes: ${component.id}`);
  }
}

for (const component of componentCatalog) {
  await access(resolve(root, 'apps', 'demo', 'src', 'examples', `${component.id}.ts`));
}

for (const page of requiredGuidePages) {
  await access(resolve(root, 'docs', 'guide', `${page}.md`));
  await access(resolve(output, 'guide', page === 'index' ? 'index.html' : `${page}.html`));
}

const frameworkLanding = await readFile(
  resolve(root, 'docs', 'guide', 'framework-integration.md'),
  'utf8',
);
if (!frameworkLanding.startsWith('# Framework integration\n')) {
  throw new Error('Framework integration landing title is missing or incorrect.');
}
if (
  !/does not ship official/iu.test(frameworkLanding) ||
  !/ships no CSS/iu.test(frameworkLanding)
) {
  throw new Error('Framework integration landing does not state adapter and CSS ownership.');
}
if (/\[[^\]]*(?:Svelte|Web Components)[^\]]*\]\([^)]*\)/iu.test(frameworkLanding)) {
  throw new Error('Framework integration landing links an unsupported framework recipe.');
}

const legacyFrameworkGuides = new Set([
  'react.md',
  'vue.md',
  'angular.md',
  'svelte.md',
  'lit-web-components.md',
]);
for (const file of await readdir(resolve(root, 'docs', 'guides'))) {
  if (legacyFrameworkGuides.has(file)) {
    throw new Error(`Legacy framework guide duplicates the canonical User Guide recipe: ${file}`);
  }
}

for (const guide of frameworkGuides) {
  if (!frameworkLanding.includes(`](./frameworks/${guide.id})`)) {
    throw new Error(`Framework landing page is missing the ${guide.title} link.`);
  }

  const sourcePath = resolve(root, 'docs', 'guide', 'frameworks', `${guide.id}.md`);
  const source = await readFile(sourcePath, 'utf8');
  if (!source.startsWith(`# ${guide.title}\n`)) {
    throw new Error(`Framework documentation title mismatch: ${guide.id}`);
  }
  for (const section of requiredFrameworkSections) {
    if (!source.includes(`\n## ${section}\n`)) {
      throw new Error(`Framework documentation is missing "${section}": ${guide.id}`);
    }
  }
  for (const marker of guide.markers) {
    if (!source.includes(marker)) {
      throw new Error(`Framework documentation is missing "${marker}": ${guide.id}`);
    }
  }
  if (!source.includes("from 'ui-headless-runtime'")) {
    throw new Error(`Framework documentation does not import the public package: ${guide.id}`);
  }
  if (/from\s+['"]ui-headless-runtime\//u.test(source)) {
    throw new Error(`Framework documentation contains a deep package import: ${guide.id}`);
  }
  if (/packages[\\/]ui-headless-runtime[\\/]src/iu.test(source)) {
    throw new Error(`Framework documentation imports workspace source: ${guide.id}`);
  }
  if (!/consumer(?:-owned| owned)|belongs to the \w+ application/iu.test(source)) {
    throw new Error(`Framework documentation does not state consumer CSS ownership: ${guide.id}`);
  }
  if (!/(?:not an official adapter|does not ship an? official adapter)/iu.test(source)) {
    throw new Error(`Framework documentation does not clarify adapter status: ${guide.id}`);
  }
  if (
    !source.includes(
      `does not declare ${guide.title.split(' ')[0]} as a direct dependency or compile`,
    )
  ) {
    throw new Error(
      `Framework documentation does not state its compile-check limitation: ${guide.id}`,
    );
  }
  if (/@ui-headless-runtime\/(?:react|vue|angular)/iu.test(source)) {
    throw new Error(
      `Framework documentation claims a framework-specific runtime package: ${guide.id}`,
    );
  }

  await access(resolve(output, 'guide', 'frameworks', `${guide.id}.html`));
}

for (const expected of frameworkArticles) {
  const article = articleRegistry.find((entry) => entry.title === expected.title);
  if (!article || article.route !== expected.route || article.docsPath !== expected.docsPath) {
    throw new Error(`Demo registry is missing the canonical ${expected.title} route.`);
  }
}

const conformanceSource = await readFile(
  resolve(root, 'docs', 'accessibility', 'demo-conformance.md'),
  'utf8',
);
if (!conformanceSource.startsWith(`${conformanceTitle}\n`)) {
  throw new Error('Accessibility conformance title is missing or incorrect.');
}
for (const section of requiredConformanceSections) {
  if (!conformanceSource.includes(`\n## ${section}\n`)) {
    throw new Error(`Accessibility conformance is missing "${section}".`);
  }
}
for (const status of ['tested', 'not applicable', 'consumer responsibility', 'pending']) {
  if (!conformanceSource.includes(`\`${status}\``)) {
    throw new Error(`Accessibility conformance checklist is missing the "${status}" status.`);
  }
}
await access(resolve(output, 'accessibility', 'demo-conformance.html'));

const collectFiles = async (directory, files = []) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await collectFiles(path, files);
    else files.push(path);
  }
  return files;
};

const demoSources = [
  ...(await collectFiles(resolve(root, 'apps', 'demo', 'src'))),
  ...(await collectFiles(resolve(root, 'metadata'))),
].filter((file) => /\.(?:ts|js)$/u.test(file));

for (const path of demoSources) {
  const source = await readFile(path, 'utf8');
  if (/\.md(?:['"`),\]\s]|$)/u.test(source)) {
    throw new Error(`Demo or metadata source contains a Markdown documentation route: ${path}`);
  }
}

const files = await collectFiles(output);

const rawWorkspaceReference =
  /(?:href|src)=["'](?!(?:https?:)?\/\/)[^"']*(?:apps|packages|metadata|scripts|tests)[\\/]/u;

for (const path of files.filter((file) => file.endsWith('.html') || file.endsWith('.js'))) {
  const generated = await readFile(path, 'utf8');
  if (
    /https?:\/\/(?:localhost|127\.0\.0\.1)|(?:href|src)=["'](?:\/\/)?(?:localhost|127\.0\.0\.1)|(?:href|src)=["']file:|(?:href|src)=["'][A-Za-z]:[\\/]/u.test(
      generated,
    ) ||
    rawWorkspaceReference.test(generated) ||
    (path.endsWith('.html') && /href="[^"]+\.md(?:[?#"])/u.test(generated))
  ) {
    throw new Error(`Generated documentation contains a development or raw-source link: ${path}`);
  }
}

console.log(`Static documentation checks passed for ${files.length} generated files.`);
