# Accordion

## Overview

Single or multiple disclosure groups with roving focus.

Pattern: Accordion. Status: stable.

## When to use

- Grouped disclosure panels with single or multiple expansion and roving keyboard navigation.
- Dynamic sections where registration cleanup must keep focus and expanded state valid.

## When not to use

- Independent one-off toggles; use Disclosure or Collapsible.
- Tabs, where only one panel should be selected and announced as a tabpanel.

## Import

```ts
import { createAccordion } from 'ui-headless-runtime';
```

## Controller creation

Create Accordion during component mount or setup, subscribe before rendering derived UI, and keep every cleanup returned by registrations or DOM binding.

## Options

- `type`, `collapsible`, `disabled`, controlled value, orientation, loop, and item IDs configure the group.

## Snapshot

- Contains expanded item IDs, active trigger ID, registered item order, disabled state, and ARIA pairs.

## Commands

- `registerItem`, `toggle`, `expand`, `collapse`, `setActive`, and `handleKeyDown` are the main commands.

## Events

- Expansion changes include the affected item ID and whether the group is single or multiple.

## Change reasons

- `trigger`, `keyboard`, `programmatic`, `registration`, `disabled`, and `controlled` separate group behavior.

## Controlled mode

Controlled accordions report the requested expanded value array/string and wait for the consumer store to commit it.

## Uncontrolled mode

Uncontrolled accordions own the expanded set and active trigger.

## DOM binding

- Register each trigger/panel pair with stable IDs and release that registration when the pair unmounts.

## Required markup

- Place triggers inside meaningful headings and connect each trigger to its panel.

## ARIA contract

- Apply `aria-expanded`, `aria-controls`, trigger IDs, and panel labelling from the item snapshot.

## Keyboard interaction

- Arrow keys: Move the active item, skipping disabled items.
- Home / End: Move to the first or last enabled item.
- Type characters: Move by normalized typeahead.

## Focus behavior

- Arrow keys, Home, and End move the active trigger while skipping disabled items.

## Nested behavior

- Nested accordions should use independent controller instances and IDs.

## Cleanup

- Unregistering the active item selects a valid neighbor; destroy releases all item registrations.

## Complete example

```ts
import { createAccordion } from 'ui-headless-runtime';

const controller = createAccordion();
const unsubscribe = controller.subscribe((snapshot) => {
  console.log(snapshot);
});

console.log(controller.getSnapshot());
unsubscribe();
controller.destroy();
```

The production demo loads the exact executable module from [`apps/demo/src/examples/accordion.ts`](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/accordion.ts).

## Edge cases

- `single`: At most one section is expanded.
- `multiple`: Several sections may remain expanded.
- `dynamic`: Registration cleanup preserves valid focus.

## Limitations

- Heading level and content hierarchy are consumer responsibilities.

## Related links

- [Live demo](https://DanieleMasone.github.io/ui-headless-runtime/#/components/accordion)
- [User Guide: controllers](../guide/controllers)
- [User Guide: rendering contract](../guide/rendering-contract)

## API reference

See [`createAccordion`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createAccordion.html).
