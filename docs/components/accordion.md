# Accordion

## Overview and use cases

Accordion groups related Disclosure sections with shared collection focus. Avoid it when content should be simultaneously visible by default.

## Options and snapshot

Choose single/multiple mode, single-mode collapsibility, loop behavior, controlled expanded IDs, and relationship prefix. Dynamic item snapshots expose trigger/panel IDs, expanded, disabled, and roving tabindex.

## Commands, events, and reasons

Register, toggle, focus, and forward trigger keyboard events. beforeChange may cancel; stateChange carries ordered IDs, item ID, and programmatic/trigger/keyboard reason.

## Keyboard, ARIA, focus, and cleanup

ArrowUp/Down, Home/End move enabled trigger focus; Enter/Space toggles. Consumers render each trigger in a heading and pair it with the panel. Dynamic removal repairs focused ID. Release registrations and destroy.

Single, multiple, and dynamic-registration examples are executed from the shared [`createExample()` source](../../apps/demo/src/examples/create-example.ts).
