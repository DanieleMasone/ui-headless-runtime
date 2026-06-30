# Contributing

## Setup

Install Node 24 and npm 11, clone the repository, and run `npm ci`. Use `npm run dev` for the demo and `npm run build:lib` when changing package exports.

## Development checks

Run `npm run format`, `npm run lint`, and `npm run typecheck`. Unit tests use `npm run test:unit`; coverage uses `npm run test:coverage`; real-browser integration uses `npm run test:browser`. Playwright uses the production `site-dist` artifact, so run coverage, `npm run build`, `npm run build:site`, and `npm run site:check` before E2E/a11y.

## Public API and docs

Add TSDoc before exporting a symbol. Run `npm run api:check`; when the intended surface changes, run `npm run api:update` and review the diff. Build TypeDoc with `npm run docs:api`. Update the relevant architecture, component, and integration documentation.

## Accessibility

Test keyboard-only interaction, focus entry/containment/restoration, Arrow/Home/End behavior, disabled items, Escape, Tab/Shift+Tab, names, roles, and relationships. Add axe states but do not treat axe as sufficient. The consumer/runtime responsibility boundary must remain explicit.

## Pull request checklist

- The change reuses shared layers and has complete cleanup.
- No avoidable `any`, broad lint suppression, placeholder, TODO, or import-time DOM access was added.
- Public API/TSDoc/API report and demo registry are coherent.
- Unit, browser, production E2E, accessibility, package smoke, and coverage gates pass.
- README/architecture/component/operations docs match actual behavior.

## Release

Maintainers follow [docs/releasing.md](docs/releasing.md). Do not add npm publish tokens or publish from branch pushes. The GitHub Release tag and package version must match exactly.
