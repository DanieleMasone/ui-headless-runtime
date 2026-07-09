# DOM binding

Some controllers expose `bind` helpers for common DOM wiring. Binding is optional; you can also forward native events manually.

## Binding rules

- Bind only after DOM elements exist.
- Keep the returned cleanup function.
- Release bindings before removing elements.
- Do not bind during server rendering.

```ts
import { createDialog } from 'ui-headless-runtime';

const dialog = createDialog();
const release = dialog.bind({
  trigger,
  content,
  backdrop,
});

release();
dialog.destroy();
```

Bindings attach listeners to consumer-owned elements. They do not create markup and do not apply styles.
