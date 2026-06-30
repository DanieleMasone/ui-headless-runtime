# Menu

## Overview and use cases

Menu is the shared action-list engine. It is reused by Dropdown Menu and Context Menu; do not use it for persistent site navigation or value selection.

## Options, snapshot, and registration

Configure controlled open state, loop behavior, close-on-select, ID, and positioning. Register item, separator, disabled, value, and submenu metadata dynamically. The snapshot includes active/selected/submenu IDs and ordered items.

## Commands, events, and reasons

Open/close/toggle, register, active movement, select, bind, and keyboard forwarding are exposed. Selection has cancellable beforeSelect and typed pointer/keyboard/programmatic reasons.

## ARIA, keyboard, focus, and typeahead

Render role menu, menuitem, and separator. Arrow keys, Home/End, Enter/Space, ArrowRight/Left, and normalized typeahead are implemented; disabled items and separators never activate.

## Cleanup and limitations

Registration and binding return cleanup. Submenu rendering and focus hand-off remain consumer responsibilities; the snapshot identifies requested submenu state.

Action, typeahead, disabled, long-collection, and submenu behaviors are rendered by the shared [`createExample()` source](../../apps/demo/src/examples/create-example.ts).
