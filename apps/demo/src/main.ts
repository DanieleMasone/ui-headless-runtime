import { createCommandPalette } from 'ui-headless-runtime';
import sourceCode from './examples/create-example.ts?raw';
import { EventLog } from './app/event-log';
import { getTheme, setTheme, type ThemeChoice } from './app/theme';
import { createExample, type ExampleInstance } from './examples/create-example';
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

const base = import.meta.env.BASE_URL;
const siteLink = (path: string): string => `${base}${path.replace(/^\//u, '')}`;
const articleLinks = (section: ArticleSection): string =>
  articleRegistry
    .filter((article) => article.section === section)
    .map((article) => `<a href="#${article.route}">${article.title}</a>`)
    .join('');

app.innerHTML = `
  <header class="topbar">
    <button class="mobile-menu" type="button" aria-label="Open navigation" aria-controls="sidebar">☰</button>
    <a class="brand" href="#/" aria-label="UI Headless Runtime home"><span>UHR</span><strong>UI Headless Runtime</strong></a>
    <button class="search-trigger" type="button" aria-haspopup="dialog"><span>Search documentation</span><kbd>⌘ K</kbd></button>
    <label class="theme-control">Theme
      <select aria-label="Theme">
        <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
      </select>
    </label>
  </header>
  <aside class="sidebar" id="sidebar">
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
  <section class="command-dialog" aria-label="Documentation search" hidden>
    <label>Search pages<input class="command-input" type="search" autocomplete="off" /></label>
    <div class="command-results" role="listbox"></div>
    <p class="command-empty" hidden>No matching page.</p>
  </section>
`;

const main = app.querySelector<HTMLElement>('#main');
const sidebar = app.querySelector<HTMLElement>('#sidebar');
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
mobileMenu.addEventListener('click', () => {
  const open = document.body.dataset.navOpen !== 'true';
  document.body.dataset.navOpen = String(open);
  mobileMenu.setAttribute('aria-expanded', String(open));
});
sidebar.addEventListener('click', (event) => {
  if ((event.target as Element).closest('a')) document.body.dataset.navOpen = 'false';
});

const pages = [
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
      location.hash = page.route;
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
  commandEmpty.hidden = !snapshot.empty;
  commandResults.replaceChildren(
    ...snapshot.commands.map((command) => {
      const result = document.createElement('button');
      result.type = 'button';
      result.setAttribute('role', 'option');
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
commandInput.addEventListener('input', () =>
  commandPalette.setQuery(commandInput.value, { reason: 'input' }),
);
commandInput.addEventListener('keydown', (event) => commandPalette.handleKeyDown(event));
renderCommands();

let currentExample: ExampleInstance | undefined;
const disposePage = (): void => {
  currentExample?.destroy();
  currentExample = undefined;
};

const heading = (title: string, eyebrow?: string): string => `
  ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
  <h1 tabindex="-1">${title}</h1>
`;

const renderHome = (): void => {
  main.innerHTML = `
    <section class="hero">
      <div>${heading('Behavior infrastructure for interfaces you own.', 'UI Headless Runtime')}
        <p class="lede">Accessible, framework-agnostic TypeScript controllers for overlays, collections, selection, disclosure, and feedback—without CSS, JSX, or renderer lock-in.</p>
        <div class="actions"><a class="button primary" href="#/components">Explore components</a><a class="button" href="https://www.npmjs.com/package/ui-headless-runtime">View on npm</a></div>
      </div>
      <div class="install"><span>Install</span><code>npm install ui-headless-runtime</code></div>
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
    <section><div class="section-heading"><div><h2>Component runtime</h2><p>One lifecycle and state language across every interaction family.</p></div><a href="#/components">View all</a></div>
      <div class="component-grid">${componentRegistry.map((component) => `<a href="#${component.route}"><span>${component.category}</span><strong>${component.name}</strong><p>${component.summary}</p></a>`).join('')}</div>
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
    <div class="lab-toolbar"><label>Scenario<select class="scenario-select">${definition.scenarios.map((item) => `<option value="${item.id}">${item.label}</option>`).join('')}</select></label><a href="${siteLink(definition.apiPath)}">API reference</a></div>
    <div class="laboratory">
      <section class="lab-example" aria-labelledby="live-heading"><h2 id="live-heading">Live example</h2><p class="scenario-description"></p><div class="example-mount"></div></section>
      <aside class="lab-inspector" aria-label="Runtime inspector"><div class="panel-heading"><h2>State inspector</h2><span>Live</span></div><pre class="state-output" tabindex="0"></pre></aside>
      <section class="lab-events" aria-labelledby="events-heading"><div class="panel-heading"><h2 id="events-heading">Event log</h2><button class="clear-events" type="button">Clear</button></div><div class="event-output" aria-live="polite" aria-label="Event log entries" tabindex="0"></div></section>
      <section class="lab-source" aria-labelledby="source-heading"><div class="panel-heading"><h2 id="source-heading">Executed source</h2><button class="copy-source" type="button">Copy</button></div><p>This is the module used by the live laboratory; it imports only the package public API.</p><pre tabindex="0"><code></code></pre><p class="copy-status" role="status"></p></section>
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
  if (
    !scenarioSelect ||
    !description ||
    !mount ||
    !stateOutput ||
    !eventOutput ||
    !clear ||
    !source ||
    !copy ||
    !copyStatus
  )
    return;
  source.textContent = sourceCode;
  const log = new EventLog(eventOutput);
  const launch = (): void => {
    currentExample?.destroy();
    const selected =
      definition.scenarios.find((item) => item.id === scenarioSelect.value) ??
      definition.scenarios[0];
    if (!selected) return;
    description.textContent = selected.description;
    currentExample = createExample(definition.id, selected.id, mount, (event) => {
      log.push(event);
      stateOutput.textContent = serializeForInspector(currentExample?.getSnapshot());
    });
    stateOutput.textContent = serializeForInspector(currentExample.getSnapshot());
    log.clear();
  };
  scenarioSelect.addEventListener('change', launch);
  clear.addEventListener('click', () => log.clear());
  const copySource = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(sourceCode);
      copyStatus.textContent = 'Source copied.';
    } catch {
      copyStatus.textContent = 'Copy is unavailable in this browser context.';
    }
  };
  copy.addEventListener('click', () => {
    void copySource();
  });
  launch();
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
      <p><a href="${siteLink(`docs/${article.docsPath}`)}">Read the complete source documentation</a></p>
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
    commandCleanups.forEach((cleanup) => cleanup());
    commandPalette.destroy();
  },
  { once: true },
);
