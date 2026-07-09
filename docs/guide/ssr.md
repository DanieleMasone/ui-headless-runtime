# SSR

The package is safe to import in Node without a DOM.

## Server rules

- Do not call DOM binding helpers on the server.
- Do not serialize DOM objects.
- Use stable IDs when hydration must match server markup.
- Compute placement only after layout exists in the browser.

```ts
import { createDisclosure, hasDOM } from 'ui-headless-runtime';

const disclosure = createDisclosure();
console.log(hasDOM()); // false during Node SSR
console.log(disclosure.getSnapshot().expanded);

disclosure.destroy();
```

DOM access is resolved from bound elements or explicit owner-document helpers, not from module evaluation.
