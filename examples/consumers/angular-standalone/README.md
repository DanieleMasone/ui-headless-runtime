# Angular standalone consumer

This private Angular application compiles a direct integration with the published
`ui-headless-runtime` package. It is executable verification material, not an official Angular
adapter and not an alternate project demo.

The standalone component demonstrates:

- Accordion item registration and DOM trigger binding after view initialization;
- snapshot-driven expansion, relationship IDs, disabled state, hidden panels, and roving tabindex;
- hierarchical Tree View registration with level, set size, position, selection, expansion,
  loading, and disabled metadata;
- explicit native keyboard-event delegation and DOM focus movement;
- runtime insertion and removal of a Tree View child;
- snapshot subscriptions rendered through Angular Signals;
- registration, subscription, and controller cleanup owned by `DestroyRef`.

There is no `NgModule`, router, UI library, runtime stylesheet, repository source import, deep
package import, or framework adapter.

## Run locally

Use Node.js 24 and install this consumer independently from the repository workspaces:

```sh
npm ci
npm run typecheck
npm run build
```

The package versions are intentionally pinned, except for `ui-headless-runtime`, which uses the
supported public range `^1.0.0`.
