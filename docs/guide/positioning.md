# Positioning

The positioning engine calculates viewport-relative coordinates. Consumers apply those coordinates with their own CSS.

## Supported inputs

- Element anchors.
- Virtual anchors for pointer coordinates and context menus.
- Logical placement.
- Offset, flip, and shift options.
- RTL-aware alignment.

```ts
import { calculatePosition, createVirtualAnchor } from 'ui-headless-runtime';

const anchor = createVirtualAnchor(120, 240);
const contentRect = { width: 280, height: 160 };
const result = calculatePosition(anchor.getBoundingClientRect(), contentRect, {
  placement: 'bottom-start',
});

console.log(result.x, result.y);
```

The runtime does not observe every layout change automatically unless you use the provided auto-update helper.
