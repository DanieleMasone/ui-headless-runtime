# Events and reasons

Reasons explain why a transition was requested. They make analytics, cancellation, and exhaustive handling safer than stringly-typed event names.

## Reason examples

- `trigger`
- `keyboard`
- `pointer`
- `outside`
- `selection`
- `timeout`
- `programmatic`
- `controlled`

Each controller has its own reason union. Do not assume a reason from one controller exists on another controller.

## Cancellable lifecycle

Lifecycle events expose intent before a state change is committed. Use them to block invalid transitions, not to patch state after the fact.

```ts
import { createDialog } from 'ui-headless-runtime';

const dialog = createDialog();
const unsubscribeBeforeClose = dialog.on('beforeClose', (event) => {
  if (event.detail.details.reason === 'outside-pointer') event.preventDefault();
});

dialog.close({ reason: 'outside-pointer' });
unsubscribeBeforeClose();
dialog.destroy();
```

When a transition is cancelled, subscribers do not receive a committed state change.
