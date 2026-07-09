# Framework integration

The runtime does not ship official framework adapters. Integrate controllers through normal lifecycle hooks.

## General pattern

1. Create the controller once for a mounted component.
2. Subscribe and mirror snapshots into framework state.
3. Bind DOM after refs are available.
4. Release bindings, unsubscribe, and destroy during unmount.

## React-style conceptual example

```ts
import { createDialog } from 'ui-headless-runtime';

// Conceptual: place this inside your framework lifecycle.
const dialog = createDialog();
const unsubscribe = dialog.subscribe((snapshot) => {
  setDialogSnapshot(snapshot);
});

const release = dialog.bind({ trigger, content });

release();
unsubscribe();
dialog.destroy();
```

Framework guides in the documentation site show the same contract for React, Angular, Vue, Svelte, and Web Components.
