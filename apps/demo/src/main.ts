import { createCommandPalette, createDialog } from 'ui-headless-runtime';
import { EventLog } from './app/event-log';
import { getTheme, setTheme, type ThemeChoice } from './app/theme';
import {
  assertExampleRegistry,
  createExample,
  loadExampleSource,
  type ExampleInstance,
} from './examples/create-example';
import {
  componentRegistry,
  getComponent,
  type DemoComponentDefinition,
} from './registry/components';
import { startRouter } from './routing/router';
import { serializeForInspector } from './accessibility/serialize';
import { articleRegistry, getArticle, type ArticleSection } from './registry/articles';
import './styles/index.css';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Demo root #app is missing.');
assertExampleRegistry();

const base = import.meta.env.BASE_URL;
const siteLink = (path: string): string => `${base}${path.replace(/^\//u, '')}`;
const articleLinks = (section: ArticleSection): string =>
  articleRegistry
    .filter((article) => article.section === section)
    .map((article) => `<a href="#${article.route}">${article.title}</a>`)
    .join('');

app.innerHTML = `
  <header class="topbar">
    <button class="mobile-menu" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="sidebar">☰</button>
    <a class="brand" href="#/" aria-label="UI Headless Runtime home"><span>UHR</span><strong>UI Headless Runtime</strong></a>
    <button class="search-trigger" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="command-dialog"><span>Search documentation</span><svg aria-hidden="true" viewBox="0 0 20 20"><path d="m14.2 13.1 3.1 3.1-1.1 1.1-3.1-3.1a7 7 0 1 1 1.1-1.1Zm-5.2.4a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z"/></svg><kbd>⌘ K</kbd></button>
    <label class="theme-control"><span>Theme</span>
      <select aria-label="Theme">
        <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
      </select>
    </label>
  </header>
  <div class="nav-backdrop" hidden></div>
  <aside class="sidebar" id="sidebar" aria-label="Site navigation">
    <button class="nav-close" type="button">Close navigation</button>
    <nav aria-label="Documentation">
      <a href="#/">Overview</a>
      <a href="#/components">Components</a>
      <p>Components</p>
      ${componentRegistry.map((component) => `<a href="#${component.route}">${component.name}</a>`).join('')}
      <p>Architecture</p>
      ${articleLinks('Architecture')}
      <p>Guides</p>
      ${articleLinks('Guides')}
      <p>Quality</p>
      ${articleLinks('Quality')}
      <a href="${siteLink('api/')}" data-external-section>API reference</a>
      <a href="${siteLink('coverage/')}" data-external-section>Coverage</a>
    </nav>
  </aside>
  <main id="main" tabindex="-1"></main>
  <footer><span>Framework-agnostic. CSS-free. Accessibility engineered.</span><a href="https://github.com/DanieleMasone/ui-headless-runtime">GitHub</a></footer>
  <section class="command-dialog" id="command-dialog" aria-label="Documentation search" hidden>
    <label>Search pages<input class="command-input" type="search" autocomplete="off" /></label>
    <div class="command-results" role="listbox"></div>
    <p class="command-empty" hidden>No matching page.</p>
  </section>
`;

const main = app.querySelector<HTMLElement>('#main');
const sidebar = app.querySelector<HTMLElement>('#sidebar');
const navBackdrop = app.querySelector<HTMLElement>('.nav-backdrop');
const navClose = app.querySelector<HTMLButtonElement>('.nav-close');
const mobileMenu = app.querySelector<HTMLButtonElement>('.mobile-menu');
const searchTrigger = app.querySelector<HTMLButtonElement>('.search-trigger');
const commandDialog = app.querySelector<HTMLElement>('.command-dialog');
const commandInput = app.querySelector<HTMLInputElement>('.command-input');
const commandResults = app.querySelector<HTMLElement>('.command-results');
const commandEmpty = app.querySelector<HTMLElement>('.command-empty');
const themeSelect = app.querySelector<HTMLSelectElement>('.theme-control select');
if (
  !main ||
  !sidebar ||
  !navBackdrop ||
  !navClose ||
  !mobileMenu ||
  !searchTrigger ||
  !commandDialog ||
  !commandInput ||
  !commandResults ||
  !commandEmpty ||
  !themeSelect
) {
  throw new Error('Demo shell failed to initialize.');
}

themeSelect.value = getTheme();
themeSelect.addEventListener('change', () => setTheme(themeSelect.value as ThemeChoice));

const mobileNavigation = createDialog({ id: 'mobile-navigation', modal: true });
const releaseMobileNavigation = mobileNavigation.bind({
  trigger: mobileMenu,
  content: sidebar,
  backdrop: navBackdrop,
});
const renderMobileNavigation = (): void => {
  const snapshot = mobileNavigation.getSnapshot();
  document.body.dataset.navOpen = String(snapshot.open);
  mobileMenu.setAttribute('aria-expanded', String(snapshot.open));
  navBackdrop.hidden = !snapshot.open;
  if (snapshot.open) {
    sidebar.setAttribute('role', 'dialog');
    sidebar.setAttribute('aria-modal', 'true');
    sidebar.setAttribute('aria-label', 'Site navigation');
  } else {
    sidebar.removeAttribute('role');
    sidebar.removeAttribute('aria-modal');
  }
};
const releaseMobileNavigationRender = mobileNavigation.subscribe(renderMobileNavigation);
mobileMenu.addEventListener('click', () => mobileNavigation.toggle({ reason: 'trigger' }));
navClose.addEventListener('click', () => mobileNavigation.close({ reason: 'trigger' }));
renderMobileNavigation();
sidebar.addEventListener('click', (event) => {
  if ((event.target as Element).closest('a')) mobileNavigation.close({ reason: 'selection' });
});

const pages = [
  { id: '/', text: 'Overview', group: 'Overview', route: '/' },
  { id: '/components', text: 'Components', group: 'Overview', route: '/components' },
  { id: 'api', text: 'API reference', group: 'Quality', route: 'api/' },
  { id: 'coverage', text: 'Coverage report', group: 'Quality', route: 'coverage/' },
  ...componentRegistry.map((component) => ({
    id: component.route,
    text: component.name,
    group: 'Components',
    route: component.route,
  })),
  ...articleRegistry.map((article) => ({
    id: article.route,
    text: article.title,
    group: article.section,
    route: article.route,
  })),
];
const commandPalette = createCommandPalette();
const commandCleanups = pages.map((page) =>
  commandPalette.registerCommand({
    id: page.id,
    text: page.text,
    group: page.group,
    perform: () => {
      if (page.route.endsWith('/')) location.href = siteLink(page.route);
      else location.hash = page.route;
    },
  }),
);
const releaseCommandDialog = commandPalette.bind({
  trigger: searchTrigger,
  content: commandDialog,
});
const releaseShortcut = commandPalette.bindShortcut(document);

const renderCommands = (): void => {
  const snapshot = commandPalette.getSnapshot();
  commandDialog.hidden = !snapshot.open;
  searchTrigger.setAttribute('aria-expanded', String(snapshot.open));
  commandEmpty.hidden = !snapshot.empty;
  commandResults.replaceChildren(
    ...snapshot.commands.map((command) => {
      const result = document.createElement('button');
      result.type = 'button';
      result.setAttribute('role', 'option');
      result.id = `site-command-${command.id.replaceAll(/[^a-z0-9_-]/giu, '-')}`;
      result.setAttribute('aria-selected', String(command.id === snapshot.activeId));
      result.dataset.active = String(command.id === snapshot.activeId);
      result.textContent = `${command.group ?? 'Page'} — ${command.text}`;
      result.addEventListener('click', () =>
        commandPalette.select(command.id, { reason: 'pointer' }),
      );
      return result;
    }),
  );
};
commandPalette.subscribe(renderCommands);
searchTrigger.addEventListener('click', () => {
  commandPalette.open({ reason: 'pointer' });
  commandInput.focus();
});
let commandComposing = false;
commandInput.addEventListener('compositionstart', () => {
  commandComposing = true;
});
commandInput.addEventListener('compositionend', () => {
  commandComposing = false;
  commandPalette.setQuery(commandInput.value, { reason: 'input' });
});
commandInput.addEventListener('input', () => {
  if (!commandComposing) commandPalette.setQuery(commandInput.value, { reason: 'input' });
});
commandInput.addEventListener('keydown', (event) => commandPalette.handleKeyDown(event));
renderCommands();

let currentExample: ExampleInstance | undefined;
let pageGeneration = 0;
const disposePage = (): void => {
  pageGeneration += 1;
  currentExample?.destroy();
  currentExample = undefined;
};

const heading = (title: string, eyebrow?: string): string => `
  ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
  <h1 tabindex="-1">${title}</h1>
`;

const renderHome = (): void => {
  const representativeComponents = componentRegistry.slice(0, 6);
  main.innerHTML = `
    <section class="hero">
      <div>${heading('Behavior infrastructure for interfaces you own.', 'UI Headless Runtime')}
        <p class="lede">Accessible, framework-agnostic TypeScript controllers for overlays, collections, selection, disclosure, and feedback—without CSS, JSX, or renderer lock-in.</p>
        <div class="actions"><a class="button primary" href="#/components">Explore components</a><a class="button" href="${siteLink('docs/guide/')}">Read the User Guide</a></div>
      </div>
      <div class="install"><span>Package status</span><code>npm release pending</code><p>The tarball is verified locally; npm publication is intentionally release-driven.</p></div>
    </section>
    <section aria-labelledby="quality-heading"><h2 id="quality-heading">Engineered as infrastructure</h2>
      <div class="metric-grid"><article><strong>16</strong><span>headless controllers</span></article><article><strong>0</strong><span>runtime dependencies</span></article><article><strong>95%+</strong><span>coverage gates</span></article><article><strong>3</strong><span>tested browser engines</span></article></div>
    </section>
    <section><h2>Quick start</h2><pre><code>import { createDialog } from 'ui-headless-runtime';

const dialog = createDialog();
const unsubscribe = dialog.subscribe(render);
dialog.open({ reason: 'programmatic' });

// On unmount
unsubscribe();
dialog.destroy();</code></pre></section>
    <section><div class="section-heading"><div><h2>Component runtime</h2><p>One lifecycle and state language across ${componentRegistry.length} controllers.</p></div><a href="#/components">View all components</a></div>
      <div class="component-grid">${representativeComponents.map((component) => `<a href="#${component.route}"><span>${component.category}</span><strong>${component.name}</strong><p>${component.summary}</p></a>`).join('')}</div>
    </section>
    <section class="statement"><h2>Accessibility is a contract, not a coat of paint.</h2><p>The runtime supplies keyboard models, focus management, semantic metadata, stable relationships, and cleanup. Final conformance also depends on the consumer's labels, markup, content, contrast, and testing.</p><a href="#/architecture/accessibility">Read the accessibility model</a></section>
    <section><h2>Works where your product works</h2><p class="frameworks">Vanilla TypeScript · React · Angular · Vue · Svelte · Lit · Web Components · SSR</p></section>
  `;
};

const renderComponentIndex = (): void => {
  main.innerHTML = `${heading('Components', 'Runtime catalogue')}<p class="lede">Every controller exposes immutable snapshots, typed reasons, subscriptions, lifecycle events, commands, and idempotent cleanup.</p><div class="component-table" role="list">${componentRegistry.map((component) => `<a role="listitem" href="#${component.route}"><span class="status">${component.status}</span><strong>${component.name}</strong><span>${component.category}</span><p>${component.summary}</p></a>`).join('')}</div>`;
};

const renderComponent = (definition: DemoComponentDefinition): void => {
  main.innerHTML = `
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/components">Components</a><span aria-hidden="true">/</span><span>${definition.name}</span></nav>
    ${heading(definition.name, `${definition.category} · ${definition.status}`)}
    <p class="lede">${definition.summary}</p>
    <div class="lab-toolbar"><label>Scenario<select class="scenario-select">${definition.scenarios.map((item) => `<option value="${item.id}">${item.label}</option>`).join('')}</select></label><a href="${siteLink(`docs/components/${definition.id}.html`)}">Component docs</a><a href="${siteLink('docs/guide/controllers.html')}">User Guide</a><a href="${siteLink(definition.apiPath)}">API reference</a></div>
    <div class="laboratory">
      <section class="lab-example lab-panel" data-panel="example" aria-labelledby="live-heading"><h2 id="live-heading">Live example</h2><p class="scenario-description"></p><div class="example-mount"></div></section>
      <aside class="lab-inspector lab-panel" data-panel="state" aria-label="Runtime inspector"><div class="panel-heading"><h2>State inspector</h2><span>Live</span></div><pre class="state-output" tabindex="0"></pre></aside>
      <section class="lab-events lab-panel" data-panel="events" aria-labelledby="events-heading"><div class="panel-heading"><h2 id="events-heading">Event log</h2><button class="clear-events" type="button">Clear</button></div><div class="event-output" aria-label="Event log entries" tabindex="0"></div></section>
      <section class="lab-source" aria-labelledby="source-heading"><div class="panel-heading"><h2 id="source-heading">Executed source</h2><button class="copy-source" type="button">Copy</button></div><p>This is the module used by the live laboratory; it imports only the package public API.</p><pre tabindex="0"><code></code></pre><p class="copy-status" role="status"></p></section>
      <p class="lab-status" role="status"></p>
    </div>
    <section class="contract-grid"><article><h2>Keyboard</h2><table><thead><tr><th>Keys</th><th>Behavior</th></tr></thead><tbody>${definition.keyboardInteractions.map((item) => `<tr><th><kbd>${item.keys}</kbd></th><td>${item.action}</td></tr>`).join('')}</tbody></table></article><article class="accessibility-panel"><h2>Accessibility contract</h2><dl><dt>Pattern and roles</dt><dd>${definition.accessibility.roles}</dd><dt>Accessible name</dt><dd>${definition.accessibility.accessibleName}</dd><dt>ARIA state</dt><dd>${definition.accessibility.ariaState}</dd><dt>Relationships</dt><dd>${definition.accessibility.relationships}</dd><dt>Focus entry</dt><dd>${definition.accessibility.focusEntry}</dd><dt>Focus movement</dt><dd>${definition.accessibility.focusMovement}</dd><dt>Focus exit</dt><dd>${definition.accessibility.focusExit}</dd><dt>Screen reader notes</dt><dd>${definition.accessibility.screenReader}</dd><dt>Consumer responsibilities</dt><dd>${definition.accessibility.consumerResponsibilities}</dd><dt>Limitations</dt><dd>${definition.accessibility.limitations}</dd></dl><ul>${definition.accessibilityNotes.map((note) => `<li>${note}</li>`).join('')}</ul></article></section>
    <section><h2>Integration and cleanup</h2><p>Create the controller during mount, subscribe once, bind consumer DOM after rendering, and call both returned cleanup functions and <code>destroy()</code> during unmount. A second destroy is always safe; commands after destroy are no-ops.</p></section>
  `;
  const scenarioSelect = main.querySelector<HTMLSelectElement>('.scenario-select');
  const description = main.querySelector<HTMLElement>('.scenario-description');
  const mount = main.querySelector<HTMLElement>('.example-mount');
  const stateOutput = main.querySelector<HTMLElement>('.state-output');
  const eventOutput = main.querySelector<HTMLElement>('.event-output');
  const clear = main.querySelector<HTMLButtonElement>('.clear-events');
  const source = main.querySelector<HTMLElement>('.lab-source code');
  const copy = main.querySelector<HTMLButtonElement>('.copy-source');
  const copyStatus = main.querySelector<HTMLElement>('.copy-status');
  const labStatus = main.querySelector<HTMLElement>('.lab-status');
  if (
    !scenarioSelect ||
    !description ||
    !mount ||
    !stateOutput ||
    !eventOutput ||
    !clear ||
    !source ||
    !copy ||
    !copyStatus ||
    !labStatus
  )
    return;
  const log = new EventLog(eventOutput);
  let launchGeneration = 0;
  const launch = async (): Promise<void> => {
    const pageToken = pageGeneration;
    const launchToken = (launchGeneration += 1);
    currentExample?.destroy();
    currentExample = undefined;
    mount.replaceChildren();
    const selected =
      definition.scenarios.find((item) => item.id === scenarioSelect.value) ??
      definition.scenarios[0];
    if (!selected) return;
    description.textContent = selected.description;
    copyStatus.textContent = '';
    source.textContent = 'Loading source module…';
    stateOutput.textContent = 'Loading snapshot…';
    log.clear();
    labStatus.textContent = `Loading ${selected.label}.`;
    const loadedSource = await loadExampleSource(definition.id);
    if (pageToken !== pageGeneration || launchToken !== launchGeneration) return;
    source.textContent = loadedSource;
    const nextExample = await createExample(definition.id, selected.id, mount, (event) => {
      log.push(event);
      stateOutput.textContent = serializeForInspector(currentExample?.getSnapshot());
    });
    if (pageToken !== pageGeneration || launchToken !== launchGeneration) {
      nextExample.destroy();
      return;
    }
    currentExample = nextExample;
    stateOutput.textContent = serializeForInspector(nextExample.getSnapshot());
    labStatus.textContent = `Scenario changed to ${selected.label}.`;
  };
  scenarioSelect.addEventListener('change', () => void launch());
  clear.addEventListener('click', () => {
    log.clear();
    labStatus.textContent = 'Event log cleared.';
  });
  const copySource = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(source.textContent);
      copyStatus.textContent = 'Source copied.';
    } catch {
      copyStatus.textContent = 'Copy is unavailable in this browser context.';
    }
  };
  copy.addEventListener('click', () => {
    void copySource();
  });
  void launch();
};

const renderArticle = (path: string): void => {
  const article = getArticle(path);
  if (!article) {
    renderNotFound();
    return;
  }
  main.innerHTML = `${heading(article.title, article.section)}
    <p class="lede">${article.summary}</p>
    <section class="prose"><h2>Contract</h2>
      <ul>${article.principles.map((principle) => `<li>${principle}</li>`).join('')}</ul>
      <h2>Integration lifecycle</h2>
      <pre><code>const controller = createDisclosure();
const unsubscribe = controller.subscribe(render);

// framework unmount
unsubscribe();
controller.destroy();</code></pre>
      <p><a href="${siteLink(`docs/${article.docsPath}`)}">Read the generated documentation</a></p>
    </section>`;
};

const renderNotFound = (): void => {
  main.innerHTML = `${heading('Page not found', '404')}<p>The requested laboratory page does not exist.</p><a class="button" href="#/">Return home</a>`;
};

const stopRouter = startRouter(({ path }) => {
  disposePage();
  document.querySelectorAll('.sidebar a').forEach((link) => link.removeAttribute('aria-current'));
  document
    .querySelector<HTMLAnchorElement>(`.sidebar a[href="#${CSS.escape(path)}"]`)
    ?.setAttribute('aria-current', 'page');
  if (path === '/') renderHome();
  else if (path === '/components') renderComponentIndex();
  else if (path.startsWith('/components/')) {
    const definition = getComponent(path.slice('/components/'.length));
    if (definition) renderComponent(definition);
    else renderNotFound();
  } else if (getArticle(path)) renderArticle(path);
  else renderNotFound();
  document.title = `${main.querySelector('h1')?.textContent ?? 'UI Headless Runtime'} · UI Headless Runtime`;
});

window.addEventListener(
  'pagehide',
  () => {
    stopRouter();
    disposePage();
    releaseShortcut();
    releaseCommandDialog();
    releaseMobileNavigationRender();
    releaseMobileNavigation();
    commandCleanups.forEach((cleanup) => cleanup());
    commandPalette.destroy();
    mobileNavigation.destroy();
  },
  { once: true },
);
