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
  'Minimal lifecycle example',
  'Edge cases',
  'Limitations',
  'Related links',
  'API reference',
];

const apiReport = await readFile(
  resolve(root, 'packages', 'ui-headless-runtime', 'etc', 'ui-headless-runtime.api.md'),
  'utf8',
);
const controllableOptions = ['ControllableValueOptions'];
const openEvents = ['OpenLifecycleEvents'];
const openReasons = ['OpenChangeReason'];
const menuOptions = ['MenuOptions', ...controllableOptions];
const menuSnapshots = ['MenuSnapshot'];
const menuControllers = ['MenuController'];
const menuEvents = ['MenuEvents', ...openEvents];
const menuReasons = ['MenuSelectReason', ...openReasons];
const componentApiContracts = {
  accordion: {
    options: ['AccordionOptions', ...controllableOptions],
    snapshot: ['AccordionSnapshot'],
    commands: ['AccordionController'],
    events: ['AccordionEvents'],
    reasons: ['AccordionChangeReason'],
  },
  collapsible: {
    options: ['DisclosureOptions', ...controllableOptions],
    snapshot: ['DisclosureSnapshot'],
    commands: ['DisclosureController'],
    events: ['DisclosureEvents'],
    reasons: ['DisclosureChangeReason'],
  },
  combobox: {
    options: ['ComboboxOptions'],
    snapshot: ['ComboboxSnapshot'],
    commands: ['ComboboxController'],
    events: ['ComboboxEvents', ...openEvents],
    reasons: ['ComboboxInputReason', 'ListboxChangeReason', ...openReasons],
  },
  'command-palette': {
    options: ['CommandPaletteOptions'],
    snapshot: ['CommandPaletteSnapshot'],
    commands: ['CommandPaletteController'],
    events: ['CommandPaletteEvents', ...openEvents],
    reasons: ['CommandPaletteReason', ...openReasons],
  },
  'context-menu': {
    options: menuOptions,
    snapshot: menuSnapshots,
    commands: [...menuControllers, 'ContextMenuController'],
    events: menuEvents,
    reasons: menuReasons,
  },
  dialog: {
    options: ['DialogOptions', ...controllableOptions],
    snapshot: ['DialogSnapshot', 'OpenSnapshot'],
    commands: ['DialogController'],
    events: openEvents,
    reasons: openReasons,
  },
  disclosure: {
    options: ['DisclosureOptions', ...controllableOptions],
    snapshot: ['DisclosureSnapshot'],
    commands: ['DisclosureController'],
    events: ['DisclosureEvents'],
    reasons: ['DisclosureChangeReason'],
  },
  'dropdown-menu': {
    options: menuOptions,
    snapshot: menuSnapshots,
    commands: [...menuControllers, 'DropdownMenuController'],
    events: menuEvents,
    reasons: menuReasons,
  },
  listbox: {
    options: ['ListboxOptions', ...controllableOptions],
    snapshot: ['ListboxSnapshot'],
    commands: ['ListboxController'],
    events: ['ListboxEvents'],
    reasons: ['ListboxChangeReason'],
  },
  menu: {
    options: menuOptions,
    snapshot: menuSnapshots,
    commands: menuControllers,
    events: menuEvents,
    reasons: menuReasons,
  },
  'navigation-menu': {
    options: ['NavigationMenuOptions', ...controllableOptions],
    snapshot: ['NavigationMenuSnapshot'],
    commands: ['NavigationMenuController'],
    events: ['NavigationMenuEvents'],
    reasons: ['NavigationMenuReason'],
  },
  popover: {
    options: ['PopoverOptions', ...controllableOptions],
    snapshot: ['OpenSnapshot'],
    commands: ['PopoverController'],
    events: openEvents,
    reasons: openReasons,
  },
  tabs: {
    options: ['TabsOptions', ...controllableOptions],
    snapshot: ['TabsSnapshot'],
    commands: ['TabsController'],
    events: ['TabsEvents'],
    reasons: ['TabsChangeReason'],
  },
  toast: {
    options: ['ToastOptions'],
    snapshot: ['ToastSnapshot'],
    commands: ['ToastController'],
    events: ['ToastEvents'],
    reasons: ['ToastChangeReason'],
  },
  tooltip: {
    options: ['TooltipOptions', ...controllableOptions],
    snapshot: ['TooltipSnapshot', 'OpenSnapshot'],
    commands: ['TooltipController'],
    events: openEvents,
    reasons: openReasons,
  },
  'tree-view': {
    options: ['TreeOptions'],
    snapshot: ['TreeSnapshot'],
    commands: ['TreeController'],
    events: ['TreeEvents'],
    reasons: ['TreeChangeReason'],
  },
};
const escapeRegularExpression = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const interfaceMembers = (name) => {
  const escapedName = escapeRegularExpression(name);
  const block = new RegExp(
    `^export interface ${escapedName}(?:<[^\\n{]+>)?(?:\\s+extends[^\\{]+)? \\{([\\s\\S]*?)^\\}`,
    'mu',
  ).exec(apiReport)?.[1];
  if (!block) throw new Error(`API report is missing interface ${name}.`);
  return [
    ...block.matchAll(/^[ ]{4}(?:readonly )?([A-Za-z][A-Za-z0-9_]*)(?:\??:|(?:<[^\n(]+>)?\()/gmu),
  ].map((match) => match[1]);
};
const unionMembers = (name) => {
  const escapedName = escapeRegularExpression(name);
  const declaration = new RegExp(`^export type ${escapedName} = ([^;]+);$`, 'mu').exec(
    apiReport,
  )?.[1];
  if (!declaration) throw new Error(`API report is missing union ${name}.`);
  return [...declaration.matchAll(/'([^']+)'/gu)].map((match) => match[1]);
};
const documentedMembers = (source, label, componentId) => {
  const line = source.split(/\r?\n/u).find((value) => value.startsWith(`- ${label}:`));
  if (!line) throw new Error(`Component documentation is missing "${label}": ${componentId}`);
  return [...line.matchAll(/`([^`]+)`/gu)].map((match) => match[1]);
};
const assertContract = (source, componentId, label, symbols, resolveMembers) => {
  const expected = new Set(symbols.flatMap(resolveMembers));
  const documented = new Set(documentedMembers(source, label, componentId));
  const missing = [...expected].filter((member) => !documented.has(member));
  const unexpected = [...documented].filter((member) => !expected.has(member));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `Component ${componentId} has a stale ${label} contract. Missing: ${missing.join(', ') || 'none'}. Unexpected: ${unexpected.join(', ') || 'none'}.`,
    );
  }
};

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
  const contract = componentApiContracts[component.id];
  if (!contract) throw new Error(`Component API contract is missing: ${component.id}`);
  assertContract(source, component.id, 'Public options', contract.options, interfaceMembers);
  assertContract(source, component.id, 'Snapshot fields', contract.snapshot, interfaceMembers);
  assertContract(source, component.id, 'Component commands', contract.commands, interfaceMembers);
  assertContract(source, component.id, 'Events', contract.events, interfaceMembers);
  assertContract(source, component.id, 'Change reasons', contract.reasons, unionMembers);
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

const obsoleteGuides = new Set([
  'react.md',
  'vue.md',
  'angular.md',
  'svelte.md',
  'lit-web-components.md',
  'controlled-state.md',
  'custom-positioning.md',
  'custom-renderer.md',
  'ssr.md',
]);
for (const file of await readdir(resolve(root, 'docs', 'guides'))) {
  if (obsoleteGuides.has(file)) {
    throw new Error(`Guide duplicates a canonical User Guide page: ${file}`);
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
