# Controllers

The runtime exposes one public entrypoint:

```ts
import { createDialog, createListbox } from 'ui-headless-runtime';
```

Each factory returns a controller for a specific pattern. Controllers may expose domain-specific commands such as `open`, `close`, `select`, `registerItem`, or `handleKeyDown`, but they share the same operational model.

## Common contract

```ts
interface RuntimeController<TSnapshot> {
  getSnapshot(): Readonly<TSnapshot>;
  subscribe(listener: (snapshot: Readonly<TSnapshot>) => void): () => void;
  destroy(): void;
}
```

`getSnapshot()` returns immutable view data. `subscribe()` returns an unsubscribe function. `destroy()` releases resources and makes later commands safe no-ops.

## Component families

- Overlay: Dialog, Popover, Tooltip.
- Navigation: Menu, Dropdown Menu, Context Menu, Command Palette, Navigation Menu.
- Disclosure: Disclosure, Collapsible, Accordion.
- Selection: Tabs, Listbox, Combobox, Tree View.
- Feedback: Toast.
