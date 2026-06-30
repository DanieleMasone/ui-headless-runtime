# SSR

Package import and controller creation are DOM-free. Render the initial snapshot on the server, provide deterministic IDs when server/client request order may differ, and bind DOM only after hydration.

```ts
const dialog = createDialog({ id: `account-dialog-${recordId}` });
const snapshot = dialog.getSnapshot();
// Render role, id, hidden, and aria-modal from snapshot.
```

Do not serialize DOM objects. On the client, subscribe, hydrate markup, call `bind`, and release binding/subscription before `destroy()`. ESM import and CJS require are exercised in the package smoke test without a DOM.
