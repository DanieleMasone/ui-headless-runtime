# Repository operations

## Structure

- `packages/ui-headless-runtime`: the only publishable package and only public API entry point.
- `apps/demo`: private Vanilla TypeScript component laboratory; it imports only the package name.
- `examples/consumers`: isolated React, Vue, and Angular applications that install the published npm package; they are not root workspaces or official adapters.
- `tests`: unit, real-browser, E2E, accessibility, and package-consumer verification.
- `docs`: User Guide, architecture, accessibility, component contracts, framework guides, ADRs, and release operations.
- `scripts`: portable build/site/package checks with verified workspace boundaries.

## Commands

Use `npm ci` for reproducible installs. `npm run setup:browsers`, `typecheck`, `lint`, `unused:check`, `test:coverage`, `test:browser`, `build`, `api:check`, `docs:check`, `package:check`, `build:site`, `site:check`, and `test:acceptance` are individual gates. `npm run ci` runs the local CI sequence. `npm run examples:verify` independently installs, typechecks, and builds the framework consumers and is intentionally outside core CI. `npm run release:metadata` checks synchronized versions, the finalized changelog entry, and npm registry availability. `npm run release:verify` covers all publish gates without publishing.

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
- Canonical React, Vue, and Angular recipes live under `docs/guide/frameworks/`; separately compiled npm consumers live under `examples/consumers/`. Keep consumer framework packages inside those private standalone projects, outside root workspaces and core CI. They demonstrate application-owned integration and must never become official adapters or runtime dependencies.
- Dependency version updates are manual: run `npm outdated` quarterly, before release, and immediately when a security alert requires action.
- `vitepress@2.0.0-alpha.17` is an exact, documentation-only exception: the latest stable VitePress line resolves to Vite/esbuild versions with unresolved npm advisories. Replace it only with a stable audit-clean release that passes docs, site, and acceptance gates.
- Version `0.1.0` was the one-time manual package creation release; `0.1.1` validated the GitHub Release and npm Trusted Publishing OIDC pipeline; `1.0.0` was the first stable OIDC-published release. Do not rerun these immutable releases.
- Future releases publish through `.github/workflows/release.yml` and npm Trusted Publishing OIDC. Never add long-lived npm tokens or a GitHub environment named `npm` to the normal release workflow.

## Public API and TSDoc

Export intentionally through `src/index.ts`; avoid implementation exports and deep-import dependencies. Public symbols need meaningful TSDoc describing behavior, state ownership, lifecycle, reason, accessibility, invalid conditions, cleanup, SSR constraints, and limitations. TypeDoc is the API reference source of truth; run `npm run docs:api` and `npm run docs:check` for docs validation. Component-page options, snapshots, commands, events, and reasons are checked against the committed API report. Run `npm run api:update` only for intentional public changes and review the committed report.

## Documentation policy

Keep `README.md` short: positioning, truthful badges, links, install status, quick start, component list, quality commands, release summary, contributing, and license. Put lifecycle details, controlled/uncontrolled behavior, framework integration, accessibility responsibilities, troubleshooting, and package details in `docs/guide/`. Component pages should stay component-specific and link to the live demo, User Guide, and TypeDoc API reference. Badges must be verifiable: no npm badge before npm publication, no hardcoded coverage badge, and no absolute WCAG compliance badge.

## Accessibility and demo

Follow the applicable WAI-ARIA pattern, real keyboard behavior, focus entry/movement/exit, stable names/relationships, disabled handling, and nested overlay rules. Automated axe is supplementary to manual assertions. Demo metadata derives from the neutral catalog and the typed demo registry. Visual styles belong only in the centralized cascade-layer CSS files; runtime package code contains no CSS.

The published demo and generated documentation target applicable WCAG 2.2 AA criteria without claiming that the runtime package makes consumer products conformant. Keep `docs/accessibility/demo-conformance.md`, its versioned checklist, responsive assertions, and active-state accessibility tests synchronized with public UX changes.

## Definition of Done

Add component/unit and real-browser coverage, update docs/demo metadata, maintain 95% global coverage, build all formats, check API and tarball, build the production Pages site, run E2E/a11y, and record any unexecutable environment-dependent check honestly. Releases remain GitHub-Release-driven through OIDC.

When framework consumers change, run `npm run examples:verify`, keep their independent lockfiles current, and confirm they still use only `ui-headless-runtime` from npm through the package root.
