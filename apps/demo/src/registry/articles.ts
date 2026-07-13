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
    'architecture/overview.html',
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
    'architecture/overview.html',
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
    'architecture/state-model.html',
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
    'architecture/events.html',
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
    'architecture/focus-management.html',
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
    'architecture/collections.html',
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
    'architecture/overlay-stack.html',
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
    'architecture/positioning.html',
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
    'architecture/dom-and-ssr.html',
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
    'architecture/cleanup-and-ownership.html',
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
    'accessibility/demo-conformance.html',
  ),
  article(
    'Guides',
    '',
    'User Guide',
    'A practical path through installation, controller lifecycle, rendering, state, accessibility, SSR, testing, and package verification.',
    [
      'Start with the controller lifecycle.',
      'Apply snapshots to your own markup.',
      'Use framework lifecycles without official adapters.',
    ],
    'guide/index.html',
  ),
  article(
    'Guides',
    'installation',
    'Installation',
    'Install the single public package and import only its root entrypoint.',
    ['No runtime dependencies.', 'No runtime CSS.', 'Node 20.19+ for package consumers.'],
    'guide/getting-started.html',
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
    'guides/vanilla-javascript.html',
  ),
  article(
    'Guides',
    'typescript',
    'TypeScript',
    'Use typed options, reason unions, snapshots, and lifecycle payloads.',
    ['Avoid deep imports.', 'Narrow reasons exhaustively.', 'Treat snapshots as readonly.'],
    'guides/typescript.html',
  ),
  article(
    'Guides',
    'framework-integration',
    'Framework integration',
    'Apply the controller lifecycle from consumer-owned React, Vue, or Angular code without official adapters.',
    [
      'Create one controller per mounted component.',
      'Bind only after framework refs exist.',
      'Release, unsubscribe, and destroy during unmount.',
    ],
    'guide/framework-integration.html',
  ),
  article(
    'Guides',
    'react',
    'React integration',
    'Use an effect-owned controller, immutable snapshot subscriptions, and committed DOM refs.',
    ['Handle Strict Mode replay.', 'Bind after DOM commit.', 'Keep CSS consumer-owned.'],
    'guide/frameworks/react.html',
  ),
  article(
    'Guides',
    'vue',
    'Vue integration',
    'Keep each controller outside deep reactivity and mirror snapshots into shallow component state.',
    ['Bind after mount.', 'Release before unmount.', 'Keep CSS consumer-owned.'],
    'guide/frameworks/vue.html',
  ),
  article(
    'Guides',
    'angular',
    'Angular integration',
    'Own controllers in standalone components and render immutable snapshots through Signals.',
    ['Bind in AfterViewInit.', 'Clean up through DestroyRef.', 'Keep templates consumer-owned.'],
    'guide/frameworks/angular.html',
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
    'guide/controlled-vs-uncontrolled.html',
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
    'guide/ssr.html',
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
    'guide/rendering-contract.html',
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
    'guide/positioning.html',
  ),
  article(
    'Guides',
    'migrating-to-1.0',
    'Migrating to 1.0',
    'Update renamed event and positioning types, remove internal primitive imports, and adopt the stable component contracts.',
    [
      'Review every renamed or removed package-root symbol.',
      'Update exhaustive reason handling.',
      'Re-run product keyboard, focus, and accessibility tests.',
    ],
    'guide/migrating-to-1.0.html',
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
    'guide/testing.html',
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
    'architecture/testing-strategy.html',
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
    'guide/accessibility.html',
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
    'architecture/testing-strategy.html',
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
    'architecture/testing-strategy.html',
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
    'architecture/public-api.html',
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
    'architecture/testing-strategy.html',
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
    'releasing.html',
  ),
];

export const getArticle = (path: string): DemoArticleDefinition | undefined =>
  articleRegistry.find((entry) => entry.route === path);
