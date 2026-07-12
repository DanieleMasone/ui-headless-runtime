# UI Headless Runtime

[![CI](https://github.com/DanieleMasone/ui-headless-runtime/actions/workflows/ci.yml/badge.svg)](https://github.com/DanieleMasone/ui-headless-runtime/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/DanieleMasone/ui-headless-runtime)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](https://www.typescriptlang.org/)
[![Runtime dependencies](https://img.shields.io/badge/runtime%20dependencies-0-brightgreen)](packages/ui-headless-runtime/package.json)
[![Live documentation](https://img.shields.io/website?url=https%3A%2F%2Fdanielemasone.github.io%2Fui-headless-runtime%2F&label=GitHub%20Pages)](https://danielemasone.github.io/ui-headless-runtime/)
[![Demo accessibility checked](https://img.shields.io/badge/demo%20a11y-checked-0b6bcb)](https://danielemasone.github.io/ui-headless-runtime/docs/accessibility/demo-conformance.html)

Framework-agnostic TypeScript controllers for accessible, customizable UI behavior. The runtime owns state, lifecycle, keyboard interaction, focus, selection, overlay coordination, positioning, and cleanup. Your application owns markup, CSS, branding, animation, and rendering.

- [Live demo](https://danielemasone.github.io/ui-headless-runtime/)
- [User Guide](https://danielemasone.github.io/ui-headless-runtime/docs/guide/)
- [Framework integration recipes](https://danielemasone.github.io/ui-headless-runtime/docs/guide/framework-integration.html)
- [Documentation](https://danielemasone.github.io/ui-headless-runtime/docs/)
- [API reference](https://danielemasone.github.io/ui-headless-runtime/api/)
- [Coverage report](https://danielemasone.github.io/ui-headless-runtime/coverage/)
- [Architecture documentation](https://danielemasone.github.io/ui-headless-runtime/docs/architecture/overview.html)
- [GitHub repository](https://github.com/DanieleMasone/ui-headless-runtime)

## Install

The package is not yet present on npm, so this repository intentionally does not show an npm version badge or use npm as the primary call to action. Public npm publication remains pending: an unregistered package needs an owner-authorized bootstrap before npm Trusted Publishing can be configured, after which the verified stable tarball is released through OIDC.

After the first release:

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

Every component provides a typed factory, immutable snapshot, commands, subscriptions, lifecycle events, reason unions, controlled and uncontrolled state, accessibility metadata/behavior, keyboard interaction, and idempotent cleanup.

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

The runtime follows WAI-ARIA Authoring Practices interaction models and provides accessibility behavior primitives for focus scopes, roving focus, active descendant, semantic relationships, keyboard handling, announcements, disabled state, and nested overlays. The runtime package is not, by itself, a conforming rendered product.

The published demo and generated documentation are designed and tested against applicable WCAG 2.2 AA criteria. Final consumer conformance still depends on consumer-provided markup, labels, content, contrast, layout, and assistive-technology testing. See the [User Guide accessibility chapter](https://danielemasone.github.io/ui-headless-runtime/docs/guide/accessibility.html) and the [demo and documentation conformance record](https://danielemasone.github.io/ui-headless-runtime/docs/accessibility/demo-conformance.html).

## Formats and browser support

The package publishes ESM, CommonJS, IIFE (`UIHeadlessRuntime`), source maps, and a rolled-up declaration file. Import is SSR-safe. The tested browser engines are current Playwright Chromium, Firefox, and WebKit; build target is ES2022.

## Development and testing

Requires Node 24 and npm 11.

```sh
npm ci
npm run setup:browsers
npm run ci
```

The quality pipeline runs formatting, ESLint, strict TypeScript, unit coverage (95% global thresholds), real-browser integration, ESM/CJS/IIFE build, API Extractor, TypeDoc, real-tarball consumer tests, demo/site checks, cross-browser E2E, and axe/manual accessibility assertions.

Useful commands are documented in [CONTRIBUTING.md](CONTRIBUTING.md). Generated API docs, the static documentation site, and HTML coverage are composed with the demo into one locally verified GitHub Pages artifact published at the live Pages URL.

## Release

Publishing is configured to occur only from a published GitHub Release with a matching `vX.Y.Z` tag. The dedicated workflow uses npm Trusted Publishing OIDC on a GitHub-hosted runner; no persistent npm publish token or npm GitHub environment is used. npm Trusted Publisher setup remains an external prerequisite. See [release operations](https://danielemasone.github.io/ui-headless-runtime/docs/releasing.html).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md). Public API changes require an intentional API report update and semver review.

## License

[MIT](LICENSE)
