# Toast

## Overview

Priority queue, pausable timers, announcements, and promise lifecycle.

Pattern: Status / Alert. Status: stable.

## When to use

- Ephemeral feedback queues with deterministic ordering, max visible items, and polite/assertive announcements.
- Promise lifecycles that should move from loading to success or error while preserving original rejection behavior.

## When not to use

- Blocking confirmation flows; use Dialog.
- Persistent inboxes or notification centers that need durable storage.

## Import

```ts
import { createToast } from 'ui-headless-runtime';
```

## Controller creation

Create Toast during component mount or setup, subscribe before rendering derived UI, and keep every cleanup returned by registrations or DOM binding.

## Options

- Visible limit, default timeout, priority, duplicate ID policy, announcement politeness, and pause behavior shape the queue.

## Snapshot

- Contains queued and visible toasts, status, remaining time, priority, and announcement metadata.

## Commands

- `show`, `update`, `dismiss`, `pause`, `resume`, `promise`, and `destroy` manage records.

## Events

- Queue changes identify created, updated, dismissed, timed-out, resolved, rejected, and finalized records.

## Change reasons

- `programmatic`, `timeout`, `dismiss`, `pause`, `resume`, `promise`, `success`, `error`, and `dedupe` are important.

## Controlled mode

Toast is normally uncontrolled; if mirrored externally, keep IDs stable and treat the runtime queue as the ordering authority.

## Uncontrolled mode

The controller owns queue order, timer bookkeeping, and promise transitions.

## DOM binding

- Render visible toasts from the snapshot and wire dismiss controls to `dismiss`.

## Required markup

- Use live-region containers and keep action controls reachable without stealing focus.

## ARIA contract

- Use polite/assertive metadata per toast; loading and status messages should remain perceivable.

## Keyboard interaction

- Tab: Reach consumer-provided dismiss controls.

## Focus behavior

- Toasts do not move focus automatically; user-provided actions remain in the normal tab order.

## Nested behavior

- Multiple toast controllers should use distinct regions to avoid duplicate announcements.

## Cleanup

- Destroy clears all timers, pause bookkeeping, and pending promise UI updates.

## Complete example

```ts
import { createToast } from 'ui-headless-runtime';

const controller = createToast();
const unsubscribe = controller.subscribe((snapshot) => {
  console.log(snapshot);
});

console.log(controller.getSnapshot());
unsubscribe();
controller.destroy();
```

The production demo loads the exact executable module from [`apps/demo/src/examples/toast.ts`](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/toast.ts).

## Edge cases

- `queue`: Visible capacity and deterministic ordering.
- `promise`: Loading becomes success or error.
- `pause`: Remaining timeout survives interaction.

## Limitations

- The runtime does not persist notifications across page loads.

## API reference

See [`createToast`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createToast.html).
