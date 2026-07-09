# Tree View

## Overview

Hierarchical expansion, selection, and computed set metadata.

Pattern: Tree View. Status: stable.

## When to use

Use Tree View when you need the runtime behavior described by the public `createTreeView` controller while keeping markup, rendering, and styling in your application.

## When not to use

Do not use it for simple forms where native controls provide the required behavior and accessibility with less code.

## Import

```ts
import { createTreeView } from 'ui-headless-runtime';
```

## Controller creation

Create the controller during mount or setup, subscribe once, bind DOM after rendering, and release all returned cleanup functions during unmount.

## Options

The options configure selected or active state ownership, lifecycle hooks, IDs, keyboard behavior, registration, and disabled handling.

## Snapshot

The readonly snapshot exposes active item, selected value metadata, controlled-state metadata, IDs, disabled state, and ARIA relationship metadata. Snapshots are readonly by contract and should be treated as immutable view data.

## Commands

Use typed registration, navigation, selection, active-item, and DOM binding commands exposed by the controller.

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

- Up / Down: Move through visible nodes.
- Left / Right: Collapse, expand, or move parent/child.
- Home / End: Move to tree edges.

## Focus behavior

Focus behavior follows the controller contract and WAI-ARIA pattern. Composite controllers manage active item movement; overlay controllers coordinate entry, exit, and restoration where applicable.

## Nested behavior

Nested composites should keep independent active and selected state unless the consumer intentionally connects them.

## Cleanup

Call every cleanup returned by subscriptions, bindings, registrations, timers, or observers, then call `destroy()`. Destroy is idempotent and commands after destroy are no-ops.

## Complete example

```ts
import { createTreeView } from 'ui-headless-runtime';

const controller = createTreeView();
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

The production demo uses the component-specific [`tree-view.ts` example module](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/tree-view.ts).

## Edge cases

Verified scenarios:

- `nested`: Visible preorder traversal.
- `disabled`: Navigation skips disabled nodes.
- `dynamic`: Active-node removal chooses a valid neighbor.

## Limitations

UI Headless Runtime cannot validate consumer content, visual design, framework lifecycle integration, or every assistive-technology/browser combination. Test the rendered product.

## API reference

See [`createTreeView`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createTreeView.html).
