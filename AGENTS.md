# Repository operations

## Structure

- `packages/ui-headless-runtime`: the only publishable package and only public API entry point.
- `apps/demo`: private Vanilla TypeScript component laboratory; it imports only the package name.
- `tests`: unit, real-browser, E2E, accessibility, and package-consumer verification.
- `docs`: architecture, accessibility, component contracts, guides, ADRs, and release operations.
- `scripts`: portable build/site/package checks with verified workspace boundaries.

## Commands

Use `npm ci` for reproducible installs. `npm run setup:browsers`, `typecheck`, `lint`, `unused:check`, `test:coverage`, `test:browser`, `build`, `api:check`, `docs:check`, `package:check`, `build:site`, `site:check`, and `test:acceptance` are individual gates. `npm run ci` runs the local CI sequence. `npm run release:verify` covers publish gates without publishing.

## Invariants

- No DOM global access or side effect during package evaluation.
- Zero runtime dependencies and no runtime CSS.
- One controllable-state layer, emitter, collection engine, focus layer, DOM ownership layer, and positioning engine.
- Every listener, timer, observer, registration, and subscription has idempotent cleanup.
- Commands after destroy are no-ops; final snapshots remain readable.
- Demo imports never target package source or internal paths.
- Shared component metadata lives in `metadata/components.ts`; demo-specific prose belongs in the demo registry or Markdown.
- Demo examples are lazily loaded component modules under `apps/demo/src/examples`; source panels must load the exact module used by the current component.
- Storybook is intentionally not part of the repository; keep the Vanilla TypeScript laboratory as the single behavior demo surface unless an ADR supersedes `docs/adr/no-storybook-for-runtime-demo.md`.
- Dependency version updates are manual: run `npm outdated` quarterly, before release, and immediately when a security alert requires action.

## Public API and TSDoc

Export intentionally through `src/index.ts`; avoid implementation exports and deep-import dependencies. Public symbols need meaningful TSDoc describing behavior, state ownership, lifecycle, reason, accessibility, invalid conditions, cleanup, and limitations. Run `npm run api:update` only for intentional public changes and review the committed report.

## Accessibility and demo

Follow the applicable WAI-ARIA pattern, real keyboard behavior, focus entry/movement/exit, stable names/relationships, disabled handling, and nested overlay rules. Automated axe is supplementary to manual assertions. Demo metadata derives from the neutral catalog and the typed demo registry. Visual styles belong only in the centralized cascade-layer CSS files; runtime package code contains no CSS.

## Definition of Done

Add component/unit and real-browser coverage, update docs/demo metadata, maintain 95% global coverage, build all formats, check API and tarball, build the production Pages site, run E2E/a11y, and record any unexecutable environment-dependent check honestly. Releases remain GitHub-Release-driven through OIDC.
