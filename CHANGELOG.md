# Changelog

All notable changes follow Keep a Changelog structure and semantic versioning.

## Unreleased

## [1.0.0] - 2026-07-13

### Breaking Changes

- Removed implementation primitives from the package root public API.
- Renamed event and positioning public types.
- Stabilized menu/navigation content IDs and narrowed public item contracts.
- Aligned command palette and combobox reason contracts.

### Changed

- Finalized the stable v1 public API for the published headless runtime controllers.
- Hardened overlay, focus, menu, controlled-state, cleanup and package-boundary behavior.
- Updated migration, API, component and release documentation for stable consumption.

## [0.1.1] - 2026-07-13

### Changed

- Updated npm publication metadata after the first public package release.
- Updated README installation and package links now that `ui-headless-runtime` is available on npm.
- Documented the release model: `0.1.0` manual package creation, future releases through GitHub Release and npm Trusted Publishing/OIDC.

## [0.1.0] - 2026-07-13

### Added

- Production TypeScript runtime with 16 accessible headless controllers.
- Shared controlled state, typed events, resource ownership, DOM/focus, collection, overlay, and positioning layers.
- ESM, CommonJS, IIFE, source maps, declaration rollup, API report, and generated TypeDoc.
- Interactive Vanilla TypeScript laboratory, architecture/component/integration documentation, and composed Pages output.
- Unit, Chromium browser, cross-browser E2E, axe, package-consumer, SSR, and 95% global coverage gates.
- GitHub Pages deployment and npm Trusted Publishing OIDC release workflows.

### Changed

- Hardened workspace TypeScript, ESLint, demo resolution, API Extractor, TypeDoc, package verification, Pages composition, CI, and release verification gates.
- Centralized additional runtime behavior for controlled commits, derived snapshots, DOM ownership, focus availability, submenu composition, toast timers, async combobox results, and cleanup error handling.
- Added real coverage for controlled rejections, async state commits, stale combobox responses, toast pause/resume bindings, submenu behavior, focus filtering, SSR/package consumers, and generated docs/site verification.
- Added a navigable User Guide and tightened documentation link policy so the public demo points to generated HTML docs rather than raw Markdown files.
- Hardened the published demo and documentation for mobile reflow, modal navigation/search semantics, compact laboratory panels, visible focus, and an evidence-linked WCAG 2.2 AA applicable-criteria conformance record.
- Replaced conceptual framework notes with canonical consumer-owned React, Vue, and Angular lifecycle recipes while keeping adapters, framework dependencies, and example applications outside the runtime package.
- Corrected controlled controller initialization so the first public snapshot reflects the consumer's authoritative getter values.
- Completed Navigation Menu keyboard opening and kept every registered trigger inside the active outside-interaction branch set.
- Corrected Accordion, Tree View, and Context Menu demos so their rendered keyboard, focus, selection, expansion, and pointer behavior matches the runtime contract.
- Reconciled every component page with the public API report, added contract drift checks, and removed duplicate guide pages.
