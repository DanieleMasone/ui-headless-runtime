# UI Headless Runtime

Framework-agnostic, accessible TypeScript controllers for Dialog, Popover, Menu, Tooltip,
Accordion, Tabs, Disclosure, Toast, Command Palette, Listbox, Combobox, Tree View, Navigation
Menu, and Collapsible.

```ts
import { createDialog } from 'ui-headless-runtime';

const dialog = createDialog();
const unsubscribe = dialog.subscribe((snapshot) => {
  console.log(snapshot.open);
});

dialog.open();
unsubscribe();
dialog.destroy();
```

The package includes no CSS and has zero runtime dependencies. See the
[project documentation](https://danielemasone.github.io/ui-headless-runtime/) for complete DOM
binding and accessibility responsibilities.
