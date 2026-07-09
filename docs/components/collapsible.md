# Collapsible

## Overview

Intent-oriented alias of the Disclosure primitive.

Pattern: Disclosure. Status: stable.

## When to use

- A product-language alias for a single Disclosure-powered expandable region.
- Teams that prefer “collapsible” naming while sharing the Disclosure contract and tests.

## When not to use

- Grouped collapsibles; use Accordion.
- Complex overlays or animated drawers that need focus trapping.

## Import

```ts
import { createCollapsible } from 'ui-headless-runtime';
```

## Controller creation

Create Collapsible during component mount or setup, subscribe before rendering derived UI, and keep every cleanup returned by registrations or DOM binding.

## Options

- The options intentionally mirror Disclosure: open ownership, default state, disabled state, IDs, and change callbacks.

## Snapshot

- The snapshot mirrors Disclosure with open/disabled state and trigger/panel relationships.

## Commands

- `open`, `close`, `toggle`, `bind`, `subscribe`, and `destroy` are inherited from the Disclosure primitive.

## Events

- Change events match Disclosure and carry the collapsible-specific reason union.

## Change reasons

- `trigger`, `keyboard`, `programmatic`, `controlled`, and `disabled` are sufficient for this primitive.

## Controlled mode

Controlled Collapsible exists for naming consistency while delegating ownership semantics to Disclosure.

## Uncontrolled mode

Uncontrolled Collapsible owns a single boolean open state.

## DOM binding

- Bind a trigger and content region, or manually apply snapshot IDs and expanded state.

## Required markup

- Use a button trigger and a panel/region connected with `aria-controls`.

## ARIA contract

- Apply the same `aria-expanded` and `aria-controls` contract as Disclosure.

## Keyboard interaction

- Enter / Space: Toggle content.

## Focus behavior

- Enter and Space toggle; focus otherwise follows normal document order.

## Nested behavior

- Nested collapsibles should use separate controllers and IDs.

## Cleanup

- Release the Disclosure binding and destroy the controller during unmount.

## Complete example

```ts
import { createCollapsible } from 'ui-headless-runtime';

const controller = createCollapsible();
const unsubscribe = controller.subscribe((snapshot) => {
  console.log(snapshot);
});

console.log(controller.getSnapshot());
unsubscribe();
controller.destroy();
```

The production demo loads the exact executable module from [`apps/demo/src/examples/collapsible.ts`](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/collapsible.ts).

## Edge cases

- `basic`: Simple expandable content.
- `controlled`: External ownership with the same contract.

## Limitations

- It intentionally adds no state model beyond Disclosure.

## Related links

- [Live demo](https://DanieleMasone.github.io/ui-headless-runtime/#/components/collapsible)
- [User Guide: controllers](../guide/controllers)
- [User Guide: rendering contract](../guide/rendering-contract)

## API reference

See [`createCollapsible`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createCollapsible.html).
