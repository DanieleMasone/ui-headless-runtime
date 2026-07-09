# Rendering contract

The runtime does not render DOM. It gives you metadata and behavior so your renderer can produce accessible markup.

## Consumer responsibilities

- Create semantic elements.
- Apply IDs, roles, ARIA state, and relationships from snapshots.
- Keep visible labels and accessible names stable.
- Own CSS, layout, animation, and theming.
- Remove listeners and registrations during unmount.

## Snapshot-driven rendering

```ts
import { createDisclosure } from 'ui-headless-runtime';

const disclosure = createDisclosure({ id: 'shipping' });
const snapshot = disclosure.getSnapshot();

trigger.id = snapshot.trigger.id;
trigger.setAttribute('aria-expanded', String(snapshot.expanded));
trigger.setAttribute('aria-controls', snapshot.trigger.ariaControls);
panel.id = snapshot.panel.id;
panel.hidden = snapshot.panel.hidden;

disclosure.destroy();
```

The snippet is ordinary DOM code. React, Vue, Angular, Svelte, Lit, and server templates use the same snapshot fields in their own rendering style.
