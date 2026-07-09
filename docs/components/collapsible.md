# Collapsible

## Overview

Intent-oriented alias of the Disclosure primitive.

Pattern: Disclosure. Status: stable.

## When to use

Use Collapsible when you need the runtime behavior described by the public `createCollapsible` controller while keeping markup, rendering, and styling in your application.

## When not to use

Do not use it when content must always be visible or when a native element already satisfies the interaction and semantics.

## Import

```ts
import { createCollapsible } from 'ui-headless-runtime';
```

## Controller creation

Create the controller during mount or setup, subscribe once, bind DOM after rendering, and release all returned cleanup functions during unmount.

## Options

The options configure expanded-state ownership, lifecycle hooks, disabled behavior, IDs, and relationship metadata.

## Snapshot

The readonly snapshot exposes expanded state, controlled-state metadata, IDs, disabled state, and trigger/panel relationship metadata. Snapshots are readonly by contract and should be treated as immutable view data.

## Commands

Use typed open, close, toggle, bind, subscribe, and destroy commands exposed by the controller.

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

- Enter / Space: Toggle content.

## Focus behavior

Focus behavior follows the controller contract and WAI-ARIA pattern. Composite controllers manage active item movement; overlay controllers coordinate entry, exit, and restoration where applicable.

## Nested behavior

Nested disclosure content is allowed, but each controller owns only its own expanded state and cleanup.

## Cleanup

Call every cleanup returned by subscriptions, bindings, registrations, timers, or observers, then call `destroy()`. Destroy is idempotent and commands after destroy are no-ops.

## Complete example

```ts
import { createCollapsible } from 'ui-headless-runtime';

const controller = createCollapsible();
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

The production demo uses the component-specific [`collapsible.ts` example module](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/collapsible.ts).

## Edge cases

Verified scenarios:

- `basic`: Simple expandable content.
- `controlled`: External ownership with the same contract.

## Limitations

UI Headless Runtime cannot validate consumer content, visual design, framework lifecycle integration, or every assistive-technology/browser combination. Test the rendered product.

## API reference

See [`createCollapsible`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createCollapsible.html).
