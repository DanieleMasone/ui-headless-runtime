# Contributing

## Setup

Install Node 24 and npm 11, clone the repository, and run `npm ci`. Run `npm run setup:browsers` before local Playwright checks. Use `npm run dev` for the demo and `npm run build:lib` when changing package exports.

## Development checks

Run `npm run format`, `npm run lint`, `npm run unused:check`, and `npm run typecheck`. Unit tests use `npm run test:unit`; coverage uses `npm run test:coverage`; real-browser integration uses `npm run test:browser`. Playwright uses the production `site-dist` artifact, so run coverage, `npm run build`, `npm run docs:check`, `npm run build:site`, and `npm run site:check` before `npm run test:acceptance`.

Dependency version updates are manual. Run `npm outdated` and `npm audit` before each release, quarterly during maintenance, and immediately when a security alert requires action. Dependabot security alerts and the dependency graph remain useful, but version-update PRs are intentionally disabled to avoid noisy grouped toolchain updates.

## Public API and docs

Add TSDoc before exporting a symbol. Run `npm run api:check`; when the intended surface changes, run `npm run api:update` once and review the diff. Build TypeDoc with `npm run docs:api`, the static documentation with `npm run docs:site`, and validate it with `npm run docs:check`.

Keep documentation in English. Use `README.md` as a short landing page and put product-facing usage material in `docs/guide/`. Update component pages only with component-specific behavior; move shared lifecycle, state, DOM binding, accessibility, SSR, testing, and troubleshooting material to the User Guide. Demo links must target generated HTML routes, not local Markdown files.

## Accessibility

Test keyboard-only interaction, focus entry/containment/restoration, Arrow/Home/End behavior, disabled items, Escape, Tab/Shift+Tab, names, roles, and relationships. Add axe states but do not treat axe as sufficient. The consumer/runtime responsibility boundary must remain explicit.

## Pull request checklist

- The change reuses shared layers and has complete cleanup.
- No avoidable `any`, broad lint suppression, placeholder note, or import-time DOM access was added.
- Public API/TSDoc/API report, neutral component catalog, demo registry, and exact source modules are coherent.
- README, User Guide, component docs, TypeDoc, and demo documentation links are coherent.
- No public demo or generated site link points to a raw `.md` file.
- Unit, browser, production E2E, accessibility, package smoke, and coverage gates pass.
- README/architecture/component/operations docs match actual behavior.

## Release

Maintainers follow the release operations documentation in `docs/releasing.md`. Do not add npm publish tokens or publish from branch pushes. The GitHub Release tag and package version must match exactly, and npm documentation must not claim the package is published until `npm view ui-headless-runtime version` succeeds.
