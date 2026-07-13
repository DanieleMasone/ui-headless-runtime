# Getting started

Install the published `ui-headless-runtime` package from npm:

```sh
npm install ui-headless-runtime
```

## Minimal controller

```ts
import { createDisclosure } from 'ui-headless-runtime';

const disclosure = createDisclosure({ id: 'details' });
const unsubscribe = disclosure.subscribe((snapshot) => {
  console.log(snapshot.expanded);
});

disclosure.expand({ reason: 'programmatic' });

unsubscribe();
disclosure.destroy();
```

Every example imports from the package root. Deep imports are unsupported and intentionally rejected by package verification.

## Runtime assumptions

- No runtime dependencies.
- No runtime CSS.
- SSR-safe import.
- Consumer-owned DOM and styling.
- Cleanup is explicit and idempotent.
