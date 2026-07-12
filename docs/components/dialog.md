# Dialog

## Overview

Modal and non-modal focus scopes with nested overlay coordination.

Pattern: WAI-ARIA Dialog (Modal). Status: stable.

## When to use

- Modal application surfaces that must trap focus, inert the page, and restore focus on close.
- Non-modal overlays that still need outside-interaction handling and typed lifecycle events.
- Nested dialog flows where Escape and outside dismissal must affect only the topmost layer.

## When not to use

- Static sections, accordions, or inline help that should stay in normal document flow.
- Native browser prompts or simple links where no focus scope, overlay stack, or lifecycle hook is needed.

## Import

```ts
import { createDialog } from 'ui-headless-runtime';
```

## Controller creation

Create Dialog during component mount or setup, subscribe before rendering derived UI, and keep every cleanup returned by registrations or DOM binding.

## Options

- Public options: `closeOnEscape`, `closeOnOutsidePointer`, `id`, `initialFocus`, `modal`, `restoreFocus`, `defaultValue`, `getValue`, `onValueChange`, `subscribeValue`.
- Trigger, content, backdrop, anchor, and overlay branches are elements passed to `bind`, not creation options. Lifecycle cancellation is registered with `on('beforeOpen', ...)` or `on('beforeClose', ...)`.

## Snapshot

- Snapshot fields: `ariaModal`, `hasBackdrop`, `modal`, `contentId`, `controlled`, `open`, `position`, `role`, `topmost`.
- Dialog does not generate an accessible name or trigger metadata; consumers provide the final labelled markup.

## Commands

- Component commands: `bind`, `close`, `open`, `toggle`.
- `bind` wires consumer elements and returns release cleanup. Shared event methods and the `RuntimeController` lifecycle remain available.

## Events

- Events: `beforeClose`, `beforeOpen`, `close`, `open`, `afterClose`, `afterOpen`, `stateChange`.
- `beforeOpen` and `beforeClose` are cancellable; committed lifecycle payloads contain `open` and typed details.

## Change reasons

- Change reasons: `programmatic`, `trigger`, `escape-key`, `outside-pointer`, `focus-out`, `selection`, `context-menu`, `keyboard`, `hover`, `focus`.
- The public open-state union is shared by overlays; a Dialog emits only reasons reached by its configured commands and dismissal paths.

## Controlled mode

In controlled mode the dialog reports requested open changes but waits for the consumer to pass the committed `open` value back in.

## Uncontrolled mode

In uncontrolled mode the controller owns `open` and subscribers receive a new snapshot after every accepted transition.

## DOM binding

- Bind the real trigger, dialog container, and optional backdrop after rendering.
- The runtime never creates the dialog DOM; it only attaches listeners and returns cleanup.

## Required markup

- Use a labelled container with dialog semantics and visible title text.
- Keep the backdrop sibling outside the focusable dialog content when modal layering matters.

## ARIA contract

- Apply `role="dialog"`, `aria-modal`, `aria-labelledby`, and `aria-describedby` from the snapshot metadata.

## Keyboard interaction

- Enter / Space: Open from the trigger.
- Escape: Close the topmost overlay and restore focus.
- Tab / Shift+Tab: Move focus according to the configured focus scope.

## Focus behavior

- Opening modal content moves focus to the configured initial target or the first tabbable element.
- If nothing is tabbable, the content container is used as the fallback.
- Closing restores focus to the trigger when it still exists.

## Nested behavior

- Nested dialogs share the overlay stack; Escape and outside dismissal are ignored by ancestors while a child is topmost.

## Cleanup

- Call the binding cleanup before removing DOM nodes, then unsubscribe and destroy.
- Double destroy is a no-op and pending focus restoration is guarded when the trigger has been removed.

## Minimal lifecycle example

```ts
import { createDialog } from 'ui-headless-runtime';

const controller = createDialog();
const unsubscribe = controller.subscribe((snapshot) => {
  console.log(snapshot);
});

console.log(controller.getSnapshot());
unsubscribe();
controller.destroy();
```

The production demo loads the exact executable module from [`apps/demo/src/examples/dialog.ts`](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/dialog.ts).

## Edge cases

- `modal`: Focus trap, inert background, scroll lock, and restore focus.
- `non-modal`: Dismissible content without inerting or focus trapping.
- `nested`: Only the topmost dialog handles Escape.
- `no-tabbable`: The content container becomes the focus fallback.

## Limitations

- The runtime cannot provide the dialog title, validate copy, or guarantee final WCAG conformance for consumer markup.

## Related links

- [Live demo](https://DanieleMasone.github.io/ui-headless-runtime/#/components/dialog)
- [User Guide: controllers](../guide/controllers)
- [User Guide: rendering contract](../guide/rendering-contract)

## API reference

See [`createDialog`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createDialog.html).
