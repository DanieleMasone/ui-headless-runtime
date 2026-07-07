# UI Headless Runtime

[![CI](https://github.com/DanieleMasone/ui-headless-runtime/actions/workflows/ci.yml/badge.svg)](https://github.com/DanieleMasone/ui-headless-runtime/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Framework-agnostic TypeScript controllers for accessible, customizable UI behavior. The runtime owns state, lifecycle, keyboard interaction, focus, selection, overlay coordination, positioning, and cleanup. Your application owns markup, CSS, branding, animation, and rendering.

- [Local interactive demo](apps/demo) (`npm run dev`)
- [API and architecture source documentation](docs) (`npm run build:docs`)
- [Coverage report](coverage) (`npm run test:coverage`)
- [Architecture documentation](docs/architecture/overview.md)
- [npm destination after the first release](https://www.npmjs.com/package/ui-headless-runtime)
- [GitHub repository](https://github.com/DanieleMasone/ui-headless-runtime)

## Install

The package is not yet present on npm. After the first verified release:

```sh
npm install ui-headless-runtime
```

## Quick start

```ts
import { createDisclosure } from 'ui-headless-runtime';

const trigger = document.querySelector<HTMLButtonElement>('#trigger');
const panel = document.querySelector<HTMLElement>('#panel');
if (!trigger || !panel) throw new Error('Disclosure DOM is missing.');

const disclosure = createDisclosure({ id: 'deployment-details' });
const render = (): void => {
  const snapshot = disclosure.getSnapshot();
  trigger.id = snapshot.trigger.id;
  trigger.setAttribute('aria-controls', snapshot.trigger.ariaControls);
  trigger.setAttribute('aria-expanded', String(snapshot.expanded));
  panel.id = snapshot.panel.id;
  panel.hidden = snapshot.panel.hidden;
  panel.setAttribute('aria-labelledby', snapshot.panel.ariaLabelledby);
};

render();
const unsubscribe = disclosure.subscribe(render);
trigger.addEventListener('click', disclosure.handleTriggerClick);

// On unmount:
trigger.removeEventListener('click', disclosure.handleTriggerClick);
unsubscribe();
disclosure.destroy();
```

No CSS is shipped. There are zero runtime dependencies.

## Components

Dialog, Popover, Dropdown Menu, Context Menu, Tooltip, Accordion, Tabs, Disclosure, Toast, Command Palette, Menu, Listbox, Combobox, Tree View, Navigation Menu, and Collapsible.

Every component provides a typed factory, immutable snapshot, commands, subscriptions, cancellable lifecycle events, closed reason unions, controlled and uncontrolled state, accessibility metadata/behavior, keyboard interaction, and idempotent cleanup.

## API principles

All imports come from `ui-headless-runtime`; deep imports are unsupported. Controllers share:

```ts
interface RuntimeController<TSnapshot> {
  getSnapshot(): Readonly<TSnapshot>;
  subscribe(listener: (snapshot: Readonly<TSnapshot>) => void): () => void;
  destroy(): void;
}
```

Controlled state uses `getValue`, `onValueChange`, and optional `subscribeValue`. Uncontrolled state uses `defaultValue`. Every material update carries a typed reason.

## Accessibility

The runtime follows WAI-ARIA Authoring Practices interaction models and targets the behavior needed for WCAG 2.2 AA outcomes. It centralizes focus scopes, roving focus, active descendant, semantic relationships, keyboard handling, announcements, disabled state, and nested overlays.

Final conformance also depends on consumer-provided markup, labels, content, contrast, layout, and assistive-technology testing. See the [accessibility statement](docs/accessibility/conformance.md).

## Formats and browser support

The package publishes ESM, CommonJS, IIFE (`UIHeadlessRuntime`), source maps, and a rolled-up declaration file. Import is SSR-safe. The tested browser engines are current Playwright Chromium, Firefox, and WebKit; build target is ES2022.

## Development and testing

Requires Node 24 and npm 11.

```sh
npm ci
npm run ci
```

The quality pipeline runs formatting, ESLint, strict TypeScript, unit coverage (95% global thresholds), real-browser integration, ESM/CJS/IIFE build, API Extractor, TypeDoc, real-tarball consumer tests, demo/site checks, cross-browser E2E, and axe/manual accessibility assertions.

Useful commands are documented in [CONTRIBUTING.md](CONTRIBUTING.md). Generated API docs, the static documentation site, and HTML coverage are composed with the demo into one locally verified GitHub Pages artifact. The public Pages URL requires the first successful deployment.

## Release

Publishing is configured to occur only from a published GitHub Release with a matching `vX.Y.Z` tag. The dedicated workflow uses npm Trusted Publishing OIDC on a GitHub-hosted runner; no persistent npm publish token is used. npm Trusted Publisher and GitHub Environment setup remain external prerequisites. See [release operations](docs/releasing.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md). Public API changes require an intentional API report update and semver review.

## License

[MIT](LICENSE)
