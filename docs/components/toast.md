# Toast

## Overview

Priority queue, pausable timers, announcements, and promise lifecycle.

Pattern: Status / Alert. Status: stable.

## When to use

Use Toast when you need the runtime behavior described by the public `createToast` controller while keeping markup, rendering, and styling in your application.

## When not to use

Do not use it for persistent page content, blocking confirmations, or messages that require immediate focus movement.

## Import

```ts
import { createToast } from 'ui-headless-runtime';
```

## Controller creation

Create the controller during mount or setup, subscribe once, bind DOM after rendering, and release all returned cleanup functions during unmount.

## Options

The options configure queueing, announcements, timeout ownership, lifecycle hooks, IDs, and timer behavior.

## Snapshot

The readonly snapshot exposes visible items, queue order, announcement mode, remaining timeout state, and controlled lifecycle metadata. Snapshots are readonly by contract and should be treated as immutable view data.

## Commands

Use the typed queue, update, pause/resume, promise, and dismiss commands exposed by the controller.

## Events

Lifecycle and state events are typed. Consumers should observe them through `subscribe` and component-specific event callbacks rather than reading implementation internals.

## Change reasons

Change reasons identify why a transition was requested, such as programmatic calls, trigger activation, keyboard input, pointer input, selection, timeout, or controlled-state reconciliation.

## Controlled mode

Use controlled mode when an external store owns state. The controller requests changes through typed callbacks and reflects committed external state through its snapshot.

## Uncontrolled mode

Use uncontrolled mode when the controller should own state internally. Subscribe to snapshots and clean up the subscription during unmount.

## DOM binding

Use the controller's DOM binding helpers when provided. Bindings attach listeners to consumer-owned elements and return an idempotent cleanup function.

## Required markup

The consumer supplies semantic HTML, visible labels, stable IDs when needed, and any visual styling. The runtime supplies behavior and metadata, not DOM structure.

## ARIA contract

Apply roles, states, and relationships from the snapshot and component metadata. The consumer remains responsible for final labels, content semantics, contrast, and assistive-technology validation.

## Keyboard interaction

- Tab: Reach consumer-provided dismiss controls.

## Focus behavior

Focus behavior follows the controller contract and WAI-ARIA pattern. Composite controllers manage active item movement; overlay controllers coordinate entry, exit, and restoration where applicable.

## Nested behavior

Toast items do not create nested focus scopes. Interactive controls remain consumer-owned and should be minimal.

## Cleanup

Call every cleanup returned by subscriptions, bindings, registrations, timers, or observers, then call `destroy()`. Destroy is idempotent and commands after destroy are no-ops.

## Complete example

```ts
import { createToast } from 'ui-headless-runtime';

const controller = createToast();
const unsubscribe = controller.subscribe((snapshot) => {
  render(snapshot);
});

const releaseDom = controller.bind?.({
  trigger,
  content,
});

// Framework or application unmount
releaseDom?.();
unsubscribe();
controller.destroy();
```

The production demo uses the component-specific [`toast.ts` example module](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/toast.ts).

## Edge cases

Verified scenarios:

- `queue`: Visible capacity and deterministic ordering.
- `promise`: Loading becomes success or error.
- `pause`: Remaining timeout survives interaction.

## Limitations

UI Headless Runtime cannot validate consumer content, visual design, framework lifecycle integration, or every assistive-technology/browser combination. Test the rendered product.

## API reference

See [`createToast`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createToast.html).
