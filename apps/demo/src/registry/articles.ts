export type ArticleSection = 'Architecture' | 'Guides' | 'Quality';

export interface DemoArticleDefinition {
  readonly route: string;
  readonly title: string;
  readonly section: ArticleSection;
  readonly summary: string;
  readonly principles: readonly string[];
  readonly docsPath: string;
}

const article = (
  section: ArticleSection,
  slug: string,
  title: string,
  summary: string,
  principles: readonly string[],
  docsPath: string,
): DemoArticleDefinition => ({
  section,
  route: `/${section.toLocaleLowerCase()}${slug ? `/${slug}` : ''}`,
  title,
  summary,
  principles,
  docsPath,
});

export const articleRegistry: readonly DemoArticleDefinition[] = [
  article(
    'Architecture',
    '',
    'Runtime architecture',
    'How controllers separate state, behavior, DOM ownership, and rendering.',
    [
      'One public entrypoint.',
      'Immutable snapshots and idempotent destruction.',
      'Shared layers instead of component-local infrastructure.',
    ],
    'architecture/overview.md',
  ),
  article(
    'Architecture',
    'core',
    'Core controller model',
    'The host, disposable scope, event emitter, and timeout manager define one lifecycle.',
    [
      'Commands become inert after destroy.',
      'Final snapshots remain readable.',
      'Re-entrant publication is deterministic.',
    ],
    'architecture/overview.md',
  ),
  article(
    'Architecture',
    'state',
    'State ownership',
    'Controlled and uncontrolled values use the same typed transition layer.',
    [
      'Defaults initialize only uncontrolled state.',
      'External subscriptions invalidate snapshots.',
      'Every accepted request carries a reason.',
    ],
    'architecture/state-model.md',
  ),
  article(
    'Architecture',
    'lifecycle',
    'Lifecycle and events',
    'Cancellable before-events and typed state events expose transition intent.',
    [
      'Listener mutation affects the next emission.',
      'Cleanup is idempotent.',
      'Consumers own returned release functions.',
    ],
    'architecture/events.md',
  ),
  article(
    'Architecture',
    'focus',
    'Focus management',
    'Dialogs, menus, tabs, and collections share focus utilities and ownership rules.',
    [
      'Modal scopes trap Tab.',
      'Roving focus skips disabled items.',
      'Restore targets must remain connected.',
    ],
    'architecture/focus-management.md',
  ),
  article(
    'Architecture',
    'collections',
    'Collections',
    'Dynamic ordered registries drive movement, typeahead, selection, and replacement cleanup.',
    [
      'Registration tokens protect replacements.',
      'Disabled entries are skipped.',
      'Text matching is normalized.',
    ],
    'architecture/collections.md',
  ),
  article(
    'Architecture',
    'overlay',
    'Overlay stack',
    'A per-document stack coordinates Escape, nested branches, outside interaction, and modal resources.',
    [
      'Only the topmost overlay consumes Escape.',
      'Child overlays remain inside parents.',
      'Scroll and inert state are reference-counted.',
    ],
    'architecture/overlay-stack.md',
  ),
  article(
    'Architecture',
    'positioning',
    'Positioning',
    'The internal engine returns collision-aware viewport coordinates without applying CSS.',
    [
      'Logical placements support RTL.',
      'Flip and shift are deterministic.',
      'Virtual anchors support context menus.',
    ],
    'architecture/positioning.md',
  ),
  article(
    'Architecture',
    'ssr',
    'DOM and SSR',
    'Module evaluation is DOM-free; browser resources are resolved only from bound elements.',
    [
      'Node import requires no DOM shim.',
      'Owner documents support multiple realms.',
      'DOM commands remain explicit.',
    ],
    'architecture/dom-and-ssr.md',
  ),
  article(
    'Architecture',
    'cleanup',
    'Cleanup and ownership',
    'Listeners, observers, timers, registrations, and subscriptions have explicit owners.',
    [
      'Returned releases are idempotent.',
      'Destroy releases composed controllers.',
      'Late commands are no-ops.',
    ],
    'architecture/cleanup-and-ownership.md',
  ),
  article(
    'Architecture',
    'accessibility',
    'Accessibility architecture',
    'The runtime supplies behavior and semantic metadata while consumers own final markup and content.',
    [
      'Follow the applicable APG interaction model.',
      'Axe supplements keyboard and focus assertions.',
      'Conformance depends on the rendered product.',
    ],
    'accessibility/conformance.md',
  ),
  article(
    'Guides',
    'installation',
    'Installation',
    'Install the single public package and import only its root entrypoint.',
    ['No runtime dependencies.', 'No runtime CSS.', 'Node 20.19+ for package consumers.'],
    'guides/typescript.md',
  ),
  article(
    'Guides',
    'vanilla-javascript',
    'Vanilla JavaScript',
    'Create, subscribe, render, bind, and destroy controllers without a framework.',
    [
      'Keep render functions snapshot-driven.',
      'Forward native events explicitly.',
      'Release bindings before removing DOM.',
    ],
    'guides/vanilla-javascript.md',
  ),
  article(
    'Guides',
    'typescript',
    'TypeScript',
    'Use typed options, reason unions, snapshots, and lifecycle payloads.',
    ['Avoid deep imports.', 'Narrow reasons exhaustively.', 'Treat snapshots as readonly.'],
    'guides/typescript.md',
  ),
  article(
    'Guides',
    'react',
    'React integration',
    'Integrate with effects and external-store subscriptions; no official adapter is required.',
    ['Create per mounted component.', 'Bind after DOM commit.', 'Destroy in effect cleanup.'],
    'guides/react.md',
  ),
  article(
    'Guides',
    'angular',
    'Angular integration',
    'Own controllers in component lifecycle hooks and render snapshots through application state.',
    ['Bind in AfterViewInit.', 'Release in OnDestroy.', 'Keep templates consumer-owned.'],
    'guides/angular.md',
  ),
  article(
    'Guides',
    'vue',
    'Vue integration',
    'Store the controller outside reactive proxying and mirror snapshots into shallow state.',
    ['Bind after mount.', 'Unsubscribe before unmount.', 'No Vue adapter is shipped.'],
    'guides/vue.md',
  ),
  article(
    'Guides',
    'svelte',
    'Svelte integration',
    'Bridge controller subscriptions to component state and actions.',
    ['Mount once.', 'Return action cleanup.', 'Render ARIA from snapshots.'],
    'guides/svelte.md',
  ),
  article(
    'Guides',
    'web-components',
    'Web Components',
    'Bind against shadow-owned DOM and use composed event paths for outside interaction.',
    [
      'Use the element owner document.',
      'Forward keyboard events.',
      'Release on disconnectedCallback.',
    ],
    'guides/lit-web-components.md',
  ),
  article(
    'Guides',
    'controlled-state',
    'Controlled state',
    'Bridge application stores with get, change callback, and external subscription.',
    [
      'The runtime requests changes.',
      'The external store remains authoritative.',
      'Notify after store updates.',
    ],
    'guides/controlled-state.md',
  ),
  article(
    'Guides',
    'ssr',
    'SSR integration',
    'Import and create DOM-free controllers on the server; bind elements only on the client.',
    [
      'Do not serialize DOM objects.',
      'Use deterministic IDs when hydrating.',
      'Position only after layout.',
    ],
    'guides/ssr.md',
  ),
  article(
    'Guides',
    'custom-rendering',
    'Custom rendering',
    'Snapshots are renderer-neutral and work with HTML, templates, JSX, or custom elements.',
    [
      'Apply roles and relationships exactly.',
      'Keep visual state in CSS.',
      'Do not copy internal state.',
    ],
    'guides/custom-renderer.md',
  ),
  article(
    'Guides',
    'custom-positioning',
    'Custom positioning',
    'Consume returned coordinates or provide deterministic geometry options.',
    [
      'Coordinates are viewport-relative.',
      'Consumers apply transforms/styles.',
      'Call update after size changes.',
    ],
    'guides/custom-positioning.md',
  ),
  article(
    'Quality',
    '',
    'Quality gates',
    'One local sequence validates types, behavior, browsers, artifacts, docs, and accessibility.',
    [
      'Production artifacts are tested.',
      'Coverage thresholds are global.',
      'Release verification never publishes.',
    ],
    'architecture/testing-strategy.md',
  ),
  article(
    'Quality',
    'testing',
    'Testing strategy',
    'Unit, real-browser, E2E, and accessibility tests cover different failure classes.',
    [
      'jsdom covers pure behavior.',
      'Chromium integration covers platform focus/events.',
      'Playwright covers the production site.',
    ],
    'architecture/testing-strategy.md',
  ),
  article(
    'Quality',
    'accessibility',
    'Accessibility verification',
    'Axe runs in initial and active states alongside manual keyboard and focus assertions.',
    [
      'Names and relationships are asserted.',
      'Disabled behavior is exercised.',
      'Consumer responsibilities remain explicit.',
    ],
    'accessibility/conformance.md',
  ),
  article(
    'Quality',
    'coverage',
    'Coverage',
    'V8 coverage enforces 95% statements, branches, functions, and lines globally.',
    [
      'No component exclusions.',
      'HTML reports publish under /coverage/.',
      'Threshold failures block CI.',
    ],
    'architecture/testing-strategy.md',
  ),
  article(
    'Quality',
    'browser-support',
    'Browser support',
    'Production E2E covers Playwright Chromium, Firefox, and WebKit.',
    [
      'Build target is ES2022.',
      'Real DOM tests cover focus and events.',
      'Engine failures block Pages deployment.',
    ],
    'architecture/testing-strategy.md',
  ),
  article(
    'Quality',
    'api-stability',
    'API stability',
    'API Extractor reports and declaration rollups make public changes reviewable.',
    [
      'Exports originate in src/index.ts.',
      'Deep imports are unsupported.',
      'Intentional changes update the committed report.',
    ],
    'architecture/public-api.md',
  ),
  article(
    'Quality',
    'package-verification',
    'Package verification',
    'A real tarball is inspected and installed into an isolated consumer.',
    [
      'ESM, CJS, IIFE, and TypeScript are exercised.',
      'SSR import is checked.',
      'Only publishable files may ship.',
    ],
    'architecture/testing-strategy.md',
  ),
  article(
    'Quality',
    'release',
    'Release process',
    'Published GitHub Releases trigger an OIDC-only npm workflow.',
    [
      'Tag and package version must match.',
      'Prereleases use next.',
      'External Trusted Publisher setup remains manual.',
    ],
    'releasing.md',
  ),
];

export const getArticle = (path: string): DemoArticleDefinition | undefined =>
  articleRegistry.find((entry) => entry.route === path);
