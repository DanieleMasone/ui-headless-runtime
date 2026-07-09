# Popover

## Overview

Anchored, dismissible content with collision-aware coordinates.

Pattern: Disclosure plus dialog semantics. Status: stable.

## When to use

- Anchored panels such as pickers, teaching bubbles, or compact settings that need outside dismissal.
- Nested overlay branches that should not close their parent while interaction stays inside the branch.

## When not to use

- Menus, comboboxes, or tooltips when their specialized keyboard model is required.
- Persistent sidebars or layout regions that are not overlays.

## Import

```ts
import { createPopover } from 'ui-headless-runtime';
```

## Controller creation

Create Popover during component mount or setup, subscribe before rendering derived UI, and keep every cleanup returned by registrations or DOM binding.

## Options

- Open-state ownership mirrors Dialog but without mandatory modal behavior.
- Anchor, placement, collision, offset, and focus options feed the shared positioning engine.

## Snapshot

- Includes `open`, anchor-derived coordinates, placement, IDs, and outside-interaction status.

## Commands

- `open`, `close`, `toggle`, `setAnchor`, and `bind` cover the full popover lifecycle.

## Events

- State changes identify pointer, focus-out, Escape, trigger, and programmatic requests.

## Change reasons

- Useful reasons include `trigger`, `outside`, `keyboard`, `pointer`, `focus`, `programmatic`, and `controlled`.

## Controlled mode

Controlled popovers let a parent store decide whether an outside interaction actually closes the layer.

## Uncontrolled mode

Uncontrolled popovers update immediately after the request passes lifecycle cancellation.

## DOM binding

- Bind trigger and content, then apply the computed placement styles to consumer-owned DOM.

## Required markup

- Use a button-like trigger with `aria-expanded` and an associated content region.

## ARIA contract

- Expose trigger/content relationships with the generated IDs; choose final role based on content purpose.

## Keyboard interaction

- Enter / Space: Open from the trigger.
- Escape: Close the topmost overlay and restore focus.
- Tab / Shift+Tab: Move focus according to the configured focus scope.

## Focus behavior

- Focus can remain on the trigger or move into content depending on options; Escape returns through the overlay contract.

## Nested behavior

- A descendant overlay is registered as inside so parent outside handlers do not fire accidentally.

## Cleanup

- Release positioning, outside-interaction listeners, and subscriptions before removing content.

## Complete example

```ts
import { createPopover } from 'ui-headless-runtime';

const controller = createPopover();
const unsubscribe = controller.subscribe((snapshot) => {
  console.log(snapshot);
});

console.log(controller.getSnapshot());
unsubscribe();
controller.destroy();
```

The production demo loads the exact executable module from [`apps/demo/src/examples/popover.ts`](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/popover.ts).

## Edge cases

- `basic`: Anchored to a trigger with outside dismissal.
- `edge`: Flip and shift keep content inside the viewport.
- `controlled`: The consumer owns open state.

## Limitations

- It is not a menu engine; item navigation and selection belong to Menu or Listbox controllers.

## API reference

See [`createPopover`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createPopover.html).
