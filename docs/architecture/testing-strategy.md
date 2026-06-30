# Testing strategy

Vitest unit tests cover state ownership, event cancellation, collections, reason codes, positioning, timers, async races, cleanup, SSR import, and every component controller. V8 coverage enforces 95% for statements, branches, functions, and lines without excluding production modules.

Vitest Browser Mode uses the official Playwright provider and Chromium for real focus, keyboard, pointer, bubbling, composed path, scroll lock, and nested overlays. Playwright then serves `site-dist`, the production Pages artifact, across Chromium, Firefox, and WebKit. A separate axe suite checks initial and interactive component states plus manually asserted focus and keyboard contracts.

The package smoke test installs the real tarball into an isolated consumer and verifies ESM, CJS, IIFE, declarations, exports, SSR import, and contents.
