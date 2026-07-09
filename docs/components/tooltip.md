# Tooltip

## Overview

Non-interactive description with scope coordination and safe delays.

Pattern: Tooltip. Status: stable.

## When to use

- Short, non-interactive descriptions for controls that already have a primary accessible name.
- Fine-pointer hover or keyboard-focus hints where delay and one-active-tooltip-per-scope coordination matter.

## When not to use

- Interactive popups, rich help panels, or content that users must tab into; use Popover or Dialog.

## Import

```ts
import { createTooltip } from 'ui-headless-runtime';
```

## Controller creation

Create Tooltip during component mount or setup, subscribe before rendering derived UI, and keep every cleanup returned by registrations or DOM binding.

## Options

- Open/close delays, pointer type filtering, scope ID, IDs, and controlled open state shape tooltip timing.

## Snapshot

- Exposes `open`, generated trigger/content IDs, `describedBy`, timing state, and active-scope status.

## Commands

- `open`, `close`, `scheduleOpen`, `scheduleClose`, `bind`, and `destroy` cover hover/focus timing.

## Events

- Open and close events distinguish hover, focus, Escape, delay expiry, and scope replacement.

## Change reasons

- `hover`, `focus`, `keyboard`, `delay`, `scope`, `programmatic`, and `controlled` are the useful reasons.

## Controlled mode

Controlled tooltips can reflect design-system policies while the runtime still handles pointer/focus intent.

## Uncontrolled mode

Uncontrolled tooltips own their timers and scope coordination.

## DOM binding

- Bind trigger and content; apply `aria-describedby` only while the tooltip is active.

## Required markup

- Tooltip content must be concise text and must not contain focusable controls.

## ARIA contract

- Use `role="tooltip"` on content and connect it with `aria-describedby` from the snapshot.

## Keyboard interaction

- Focus: Open and expose aria-describedby.
- Escape: Dismiss the active tooltip.

## Focus behavior

- Focus opens without hover delay; Escape closes the active tooltip and keeps focus on the trigger.

## Nested behavior

- Tooltip scopes close siblings when a new tooltip opens; they do not create interactive nested overlays.

## Cleanup

- Destroy clears pending open and close timers and releases scope ownership.

## Complete example

```ts
import { createTooltip } from 'ui-headless-runtime';

const controller = createTooltip();
const unsubscribe = controller.subscribe((snapshot) => {
  console.log(snapshot);
});

console.log(controller.getSnapshot());
unsubscribe();
controller.destroy();
```

The production demo loads the exact executable module from [`apps/demo/src/examples/tooltip.ts`](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/tooltip.ts).

## Edge cases

- `hover`: Fine-pointer hover opens after a delay.
- `focus`: Keyboard focus opens immediately.
- `scope`: Opening one tooltip closes its sibling.

## Limitations

- Touch behavior is intentionally conservative; do not depend on hover-only information for essential tasks.

## API reference

See [`createTooltip`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createTooltip.html).
