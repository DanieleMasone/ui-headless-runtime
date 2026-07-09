# Core concepts

Controllers are renderer-neutral objects. They expose snapshots, commands, subscriptions, and cleanup without owning your DOM tree.

## Controller lifecycle

Create a controller during mount or setup, render from its snapshot, subscribe to updates, bind DOM after elements exist, and release everything during unmount.

```ts
import { createTabs } from 'ui-headless-runtime';

const tabs = createTabs({ defaultValue: 'overview' });
const unsubscribe = tabs.subscribe((snapshot) => {
  console.log(snapshot.value);
});

console.log(tabs.getSnapshot());

unsubscribe();
tabs.destroy();
```

After `destroy()`, commands are no-ops and the final snapshot remains readable. This makes framework cleanup predictable even when unmount order is unusual.

## Shared language

All controllers use the same ideas: typed options, readonly snapshots, reason unions, subscriptions, lifecycle events, and explicit release functions.
