# Tabs

## Overview and use cases

Tabs switch among peer panels. Use navigation links when each destination is a separate document.

## Options and snapshot

Configure manual/automatic activation, horizontal/vertical orientation, RTL, loop, IDs, and controlled selected ID. Dynamic item snapshots include tab/panel relationships, selected, disabled, and roving tabindex.

## Commands, events, keyboard, and focus

Register, select, focus, and forward keydown. beforeSelect is cancellable. Horizontal arrows respect RTL; vertical uses Up/Down; Home/End move edges; manual mode commits with Enter/Space.

## ARIA, cleanup, and edge cases

Render tablist, tab, and tabpanel with snapshot IDs and selected state. Removal selects/focuses a valid enabled peer. Release registrations and destroy.

Automatic, manual, and vertical examples are executed from the shared [`createExample()` source](../../apps/demo/src/examples/create-example.ts).
