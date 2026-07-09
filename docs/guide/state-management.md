# State management

State can be owned by the controller or by your application. Both modes use the same snapshots and reasons.

## Uncontrolled state

Use default options when the controller should own state internally.

```ts
import { createPopover } from 'ui-headless-runtime';

const popover = createPopover({ defaultOpen: false });
const unsubscribe = popover.subscribe(renderPopover);

popover.toggle({ reason: 'trigger' });

unsubscribe();
popover.destroy();
```

## Controlled state

Use controlled options when an application store is authoritative. The controller requests a change; your store commits it and notifies the controller.

Controlled mode is useful for URL state, shared stores, undo/redo, analytics, and product rules that can reject transitions.
