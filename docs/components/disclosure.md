# Disclosure

## Overview

The shared expanded/collapsed primitive.

Pattern: Disclosure. Status: stable.

## When to use

- A single expandable region with a trigger and panel relationship.
- Controlled or uncontrolled sections that do not need group-level roving focus.

## When not to use

- Multiple coordinated sections; use Accordion.
- State that should be represented by native details/summary without extra behavior.

## Import

```ts
import { createDisclosure } from 'ui-headless-runtime';
```

## Controller creation

Create Disclosure during component mount or setup, subscribe before rendering derived UI, and keep every cleanup returned by registrations or DOM binding.

## Options

- `open`, `defaultOpen`, `disabled`, IDs, and `onOpenChange` define the primitive state contract.

## Snapshot

- Contains open/disabled state, trigger and panel IDs, and ARIA relationship metadata.

## Commands

- `open`, `close`, `toggle`, `setOpen`, `bind`, and `destroy` are intentionally small.

## Events

- Change events identify whether toggling was accepted, cancelled, or ignored due to disabled state.

## Change reasons

- `trigger`, `keyboard`, `programmatic`, `controlled`, and `disabled` are the meaningful reasons.

## Controlled mode

Controlled Disclosure emits requested values and mirrors the consumer-provided `open` value.

## Uncontrolled mode

Uncontrolled Disclosure owns the boolean state and is the base primitive for Collapsible.

## DOM binding

- Bind trigger and panel if you want runtime click/keyboard helpers, or apply snapshot metadata manually.

## Required markup

- Use a button trigger and a region/panel connected by `aria-controls`.

## ARIA contract

- Apply `aria-expanded`, `aria-controls`, and panel labelling from the snapshot.

## Keyboard interaction

- Enter / Space: Toggle expansion from the trigger.

## Focus behavior

- Enter and Space toggle from the trigger; Tab remains normal document navigation.

## Nested behavior

- Nested disclosures are independent unless a parent component such as Accordion coordinates them.

## Cleanup

- Release the binding and subscriptions before removing trigger or panel elements.

## Complete example

```ts
import { createDisclosure } from 'ui-headless-runtime';

const controller = createDisclosure();
const unsubscribe = controller.subscribe((snapshot) => {
  console.log(snapshot);
});

console.log(controller.getSnapshot());
unsubscribe();
controller.destroy();
```

The production demo loads the exact executable module from [`apps/demo/src/examples/disclosure.ts`](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/disclosure.ts).

## Edge cases

- `uncontrolled`: The controller owns expansion.
- `controlled`: An external store owns expansion.
- `disabled`: Interaction becomes a no-op.

## Limitations

- Animation, height measurement, and visual persistence are intentionally outside the runtime.

## API reference

See [`createDisclosure`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createDisclosure.html).
