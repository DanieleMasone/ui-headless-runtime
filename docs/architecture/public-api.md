# Public API

Only `packages/ui-headless-runtime/src/index.ts` defines the package surface. Consumers import the package root; deep imports are unsupported by `exports`.

Factories follow `createThing()`. Options, snapshots, controllers, reason unions, event payloads, and the positioning contract are exported as named types. Every controller implements `getSnapshot()`, `subscribe()`, and `destroy()`. Component commands use explicit verbs and typed details.

The stable shared surface is intentionally small: controller and runtime-event contracts, component-facing controllable and collection item types, `hasDOM()`, and positioning utilities. Disposable scopes, timers, emitters, state cells, collection registries, ID generation, DOM ownership, outside interaction, and focus helpers remain implementation details. This keeps internal coordination replaceable without forcing unrelated consumer migrations.

## 1.0 migration boundary

- `EventSource` and `EventListener` are renamed to `RuntimeEventSource` and `RuntimeEventListener` to avoid collisions with browser globals.
- Low-level ownership, state, collection, DOM, focus, and ID helpers exported by `0.1.x` are no longer package-root APIs. Consumers should use controller factories and their binding methods; custom positioning remains supported.
- Combobox selection uses `ComboboxSelectReason` instead of exposing `ListboxChangeReason` from its internal listbox composition.

The [1.0 migration guide](../guide/migrating-to-1.0) lists every renamed or removed package-root symbol and the component contract adjustments.

API Extractor rolls declarations into `dist/index.d.ts` and compares the committed API report. TypeDoc reads the same entry point. A public change requires `npm run api:update`, review of the report, and a semver decision.
