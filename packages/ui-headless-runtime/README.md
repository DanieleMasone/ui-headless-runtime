# UI Headless Runtime

Framework-agnostic, accessible TypeScript controllers for Dialog, Popover, Menu, Dropdown Menu,
Context Menu, Tooltip, Accordion, Tabs, Disclosure, Toast, Command Palette, Listbox, Combobox,
Tree View, Navigation Menu, and Collapsible.

```sh
npm install ui-headless-runtime
```

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
[User Guide](https://danielemasone.github.io/ui-headless-runtime/docs/guide/) for controller
lifecycle, DOM binding, cleanup, SSR, framework integration, and accessibility responsibilities.
Consumers upgrading from `0.1.x` should review the
[1.0 migration guide](https://danielemasone.github.io/ui-headless-runtime/docs/guide/migrating-to-1.0.html).
