# Getting started

The npm package name is `ui-headless-runtime`. The package is release-ready in this repository, but the public npm package is not published yet. After the first Trusted Publishing release, install it with:

```sh
npm install ui-headless-runtime
```

Until then, use the repository workspace or the verified tarball produced by `npm run package:check` for local evaluation.

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
