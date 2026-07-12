# Repository operations

## Structure

- `packages/ui-headless-runtime`: the only publishable package and only public API entry point.
- `apps/demo`: private Vanilla TypeScript component laboratory; it imports only the package name.
- `tests`: unit, real-browser, E2E, accessibility, and package-consumer verification.
- `docs`: User Guide, architecture, accessibility, component contracts, framework guides, ADRs, and release operations.
- `scripts`: portable build/site/package checks with verified workspace boundaries.

## Commands

Use `npm ci` for reproducible installs. `npm run setup:browsers`, `typecheck`, `lint`, `unused:check`, `test:coverage`, `test:browser`, `build`, `api:check`, `docs:check`, `package:check`, `build:site`, `site:check`, and `test:acceptance` are individual gates. `npm run ci` runs the local CI sequence. `npm run release:metadata` checks synchronized versions, the finalized changelog entry, and npm registry availability. `npm run release:verify` covers all publish gates without publishing.

## Invariants

- Repository documentation is written in English.
- No DOM global access or side effect during package evaluation.
- Zero runtime dependencies and no runtime CSS.
- One controllable-state layer, emitter, collection engine, focus layer, DOM ownership layer, and positioning engine.
- Every listener, timer, observer, registration, and subscription has idempotent cleanup.
- Commands after destroy are no-ops; final snapshots remain readable.
- Demo imports never target package source or internal paths.
- Shared component metadata lives in `metadata/components.ts`; demo-specific prose belongs in the demo registry or Markdown.
- Demo examples are lazily loaded component modules under `apps/demo/src/examples`; source panels must load the exact module used by the current component.
- Demo documentation links must point to generated HTML routes under `/docs/`, `/api/`, or `/coverage/`; never link local `.md` files from the public demo. GitHub source links are allowed only when labelled as source.
- Storybook is intentionally not part of the repository; keep the Vanilla TypeScript laboratory as the single behavior demo surface unless an ADR supersedes `docs/adr/no-storybook-for-runtime-demo.md`.
- Canonical React, Vue, and Angular consumer recipes live under `docs/guide/frameworks/`. They are documentation, not compiled example apps or official adapters; do not add framework packages or runtime dependencies for them.
- Dependency version updates are manual: run `npm outdated` quarterly, before release, and immediately when a security alert requires action.

## Public API and TSDoc

Export intentionally through `src/index.ts`; avoid implementation exports and deep-import dependencies. Public symbols need meaningful TSDoc describing behavior, state ownership, lifecycle, reason, accessibility, invalid conditions, cleanup, SSR constraints, and limitations. TypeDoc is the API reference source of truth; run `npm run docs:api` and `npm run docs:check` for docs validation. Component-page options, snapshots, commands, events, and reasons are checked against the committed API report. Run `npm run api:update` only for intentional public changes and review the committed report.

## Documentation policy

Keep `README.md` short: positioning, truthful badges, links, install status, quick start, component list, quality commands, release summary, contributing, and license. Put lifecycle details, controlled/uncontrolled behavior, framework integration, accessibility responsibilities, troubleshooting, and package details in `docs/guide/`. Component pages should stay component-specific and link to the live demo, User Guide, and TypeDoc API reference. Badges must be verifiable: no npm badge before npm publication, no hardcoded coverage badge, and no absolute WCAG compliance badge.

## Accessibility and demo

Follow the applicable WAI-ARIA pattern, real keyboard behavior, focus entry/movement/exit, stable names/relationships, disabled handling, and nested overlay rules. Automated axe is supplementary to manual assertions. Demo metadata derives from the neutral catalog and the typed demo registry. Visual styles belong only in the centralized cascade-layer CSS files; runtime package code contains no CSS.

The published demo and generated documentation target applicable WCAG 2.2 AA criteria without claiming that the runtime package makes consumer products conformant. Keep `docs/accessibility/demo-conformance.md`, its versioned checklist, responsive assertions, and active-state accessibility tests synchronized with public UX changes.

## Definition of Done

Add component/unit and real-browser coverage, update docs/demo metadata, maintain 95% global coverage, build all formats, check API and tarball, build the production Pages site, run E2E/a11y, and record any unexecutable environment-dependent check honestly. Releases remain GitHub-Release-driven through OIDC.
