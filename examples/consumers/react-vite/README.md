# React + Vite consumer

This standalone React 19 application consumes `ui-headless-runtime` from its public npm entrypoint.
It is intentionally outside the repository's npm workspaces: installation resolves
`ui-headless-runtime@^1.0.0` from the npm registry, never through a workspace or `file:` dependency.

## Run locally

Use Node.js 24 or newer and npm 11.5.1 or newer.

```bash
npm ci
npm run dev
```

Create and preview a production build with:

```bash
npm run build
npm run preview
```

## What this verifies

- A modal Dialog is created after React commits, subscribed, bound to consumer DOM, released, and
  destroyed without retaining an instance across Strict Mode effect replays.
- Escape and an outside pointer interaction close the Dialog; its trigger is the focus restoration
  target.
- Tabs selection is owned by React. The external policy may reject a request for the Permissions
  tab by leaving the authoritative value unchanged.
- Tab IDs, panel relationships, selection, disabled state, and roving `tabIndex` come from runtime
  snapshots. Keyboard events are forwarded explicitly to the controller.
- The optional Metrics tab registers and unregisters at runtime, including while selected.

All markup and CSS are consumer-owned. This example does not provide a React adapter, renderer,
router, or component library.
