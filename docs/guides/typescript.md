# TypeScript

```ts
import { createTabs, type TabsSnapshot } from 'ui-headless-runtime';

const tabs = createTabs({ activation: 'manual' });
const render = (snapshot: Readonly<TabsSnapshot>): void => {
  console.log(snapshot.selectedId, snapshot.focusedId);
};

const unsubscribe = tabs.subscribe(render);
const unregister = tabs.registerTab({ id: 'overview', text: 'Overview' });

render(tabs.getSnapshot());

unregister();
unsubscribe();
tabs.destroy();
```

Reason unions allow exhaustive analytics and state reducers. Import all symbols from the package root; internal paths are intentionally absent from `exports`.
