# Getting started

The npm package name is `ui-headless-runtime`. The public npm package is not published yet; its owner must complete the documented registry bootstrap and Trusted Publishing setup before the first stable OIDC release. After that release, install it with:

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
