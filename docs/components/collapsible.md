# Collapsible

## Overview and contract

Collapsible is `createDisclosure()` under simpler intent-oriented naming. It does not duplicate state, events, reasons, IDs, keyboard handling, or cleanup.

Use it for a single expandable section where “disclosure” terminology would leak into product code. `DisclosureOptions`, `DisclosureSnapshot`, controlled/uncontrolled behavior, commands, lifecycle, ARIA relationships, Enter/Space handling, disabled state, edge cases, and limitations are identical to [Disclosure](disclosure.md).

Uncontrolled, controlled, and disabled examples execute from the shared [`createExample()` source](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/create-example.ts).
