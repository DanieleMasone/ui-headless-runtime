# Controlled vs uncontrolled

Uncontrolled mode is simpler. Controlled mode is stricter and better when state must stay synchronized with an external source.

## Uncontrolled

- Provide `defaultOpen`, `defaultValue`, or equivalent default options.
- Let the controller update itself after accepted commands.
- Subscribe and render snapshots.

## Controlled

- Provide the current value.
- Provide a change callback.
- Notify the controller when the external value changes.

```ts
import { createDisclosure } from 'ui-headless-runtime';

let expanded = false;
const listeners = new Set<() => void>();

const disclosure = createDisclosure({
  getValue: () => expanded,
  onValueChange: (next) => {
    expanded = next;
    listeners.forEach((listener) => listener());
  },
  subscribeValue: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
});

const unsubscribe = disclosure.subscribe(renderDisclosure);

unsubscribe();
disclosure.destroy();
```

Controlled callbacks should not mutate DOM directly. Commit state first, then render from the next snapshot.
