# Dialog

## Overview

Modal and non-modal focus scopes with nested overlay coordination.

Pattern: WAI-ARIA Dialog (Modal). Status: stable.

## When to use

Use Dialog when you need the runtime behavior described by the public `createDialog` controller while keeping markup, rendering, and styling in your application.

## When not to use

Do not use it for static inline content that should remain in normal document flow, or when browser-native elements already provide the complete behavior.

## Import

```ts
import { createDialog } from 'ui-headless-runtime';
```

## Controller creation

Create the controller during mount or setup, subscribe once, bind DOM after rendering, and release all returned cleanup functions during unmount.

## Options

The options configure open-state ownership, lifecycle hooks, dismissal behavior, IDs, focus behavior, and positioning where applicable.

## Snapshot

The readonly snapshot exposes open state, controlled-state metadata, IDs, ARIA metadata, topmost status when relevant, and any computed placement metadata. Snapshots are readonly by contract and should be treated as immutable view data.

## Commands

Use typed open, close, toggle, bind, register, select, subscribe, and destroy commands where they apply to this controller.

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

- Enter / Space: Open from the trigger.
- Escape: Close the topmost overlay and restore focus.
- Tab / Shift+Tab: Move focus according to the configured focus scope.

## Focus behavior

Focus behavior follows the controller contract and WAI-ARIA pattern. Composite controllers manage active item movement; overlay controllers coordinate entry, exit, and restoration where applicable.

## Nested behavior

Nested overlay behavior is coordinated by the shared overlay stack. Only the topmost overlay should handle Escape or outside dismissal.

## Cleanup

Call every cleanup returned by subscriptions, bindings, registrations, timers, or observers, then call `destroy()`. Destroy is idempotent and commands after destroy are no-ops.

## Complete example

```ts
import { createDialog } from 'ui-headless-runtime';

const controller = createDialog();
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

The production demo uses the component-specific [`dialog.ts` example module](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/dialog.ts).

## Edge cases

Verified scenarios:

- `modal`: Focus trap, inert background, scroll lock, and restore focus.
- `non-modal`: Dismissible content without inerting or focus trapping.
- `nested`: Only the topmost dialog handles Escape.
- `no-tabbable`: The content container becomes the focus fallback.

## Limitations

UI Headless Runtime cannot validate consumer content, visual design, framework lifecycle integration, or every assistive-technology/browser combination. Test the rendered product.

## API reference

See [`createDialog`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createDialog.html).
