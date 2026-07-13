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

- Public options: `collapsible`, `id`, `loop`, `type`, `defaultValue`, `getValue`, `onValueChange`, `subscribeValue`.
- `type` is `single` or `multiple`; `collapsible` affects whether a single accordion may close its current item. Disabled state and custom trigger/panel IDs belong to each registered `AccordionItem`.

## Snapshot

- Snapshot fields: `controlled`, `expandedIds`, `focusedId`, `items`, `type`.
- Each item snapshot contains `id`, `triggerId`, `panelId`, `expanded`, `disabled`, and `tabIndex`.

## Commands

- Component commands: `focus`, `handleTriggerKeyDown`, `registerItem`, `toggle`.
- Every controller also provides `getSnapshot`, `subscribe`, and `destroy` through `RuntimeController`.

## Events

- Events: `beforeChange`, `stateChange`.
- Both payloads contain `itemId`, the requested `expandedIds`, and typed change details; `beforeChange` is cancellable.

## Change reasons

- Change reasons: `programmatic`, `trigger`, `keyboard`.

## Controlled mode

Controlled accordions report the requested `readonly string[]` of expanded item IDs and wait for the consumer store to commit it.

## Uncontrolled mode

Uncontrolled accordions own the expanded set and active trigger.

## DOM binding

- Register each trigger/panel pair with stable IDs and release that registration when the pair unmounts.

## Required markup

- Place triggers inside meaningful headings and connect each trigger to its panel.

## ARIA contract

- Apply `aria-expanded`, `aria-controls`, trigger IDs, and panel labelling from the item snapshot.

## Keyboard interaction

- ArrowDown / ArrowUp: Move focus between enabled triggers.
- Home / End: Move focus to the first or last enabled trigger.
- Enter / Space: Toggle the focused section.

## Focus behavior

- Arrow keys, Home, and End move the active trigger while skipping disabled items.

## Nested behavior

- Nested accordions should use independent controller instances and IDs.

## Cleanup

- Unregistering the active item selects a valid neighbor; destroy releases all item registrations.

## Minimal lifecycle example

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
