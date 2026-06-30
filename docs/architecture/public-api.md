# Public API

Only `packages/ui-headless-runtime/src/index.ts` defines the package surface. Consumers import the package root; deep imports are unsupported by `exports`.

Factories follow `createThing()`. Options, snapshots, controllers, reason unions, event payloads, and shared utilities are exported as named types. Every controller implements `getSnapshot()`, `subscribe()`, and `destroy()`. Component commands use explicit verbs and typed details.

API Extractor rolls declarations into `dist/index.d.ts` and compares the committed API report. TypeDoc reads the same entry point. A public change requires `npm run api:update`, review of the report, and a semver decision.
