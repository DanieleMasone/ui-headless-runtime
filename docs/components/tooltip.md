# Tooltip

## Overview and use cases

Tooltip provides a short non-interactive description for hover and focus. Important or interactive content belongs in visible text or a Popover.

## Options, snapshot, and lifecycle

Configure controlled open state, open/close delay, scope, ID, and positioning. The snapshot supplies tooltip/trigger IDs and `aria-describedby` only while open. Standard cancellable open lifecycle and typed hover/focus/Escape reasons apply.

## Interaction and accessibility

Fine-pointer hover is delayed; keyboard focus opens immediately. Touch pointer entry is ignored because hover tooltips are unreliable on touch. One tooltip is active per scope. Content must use role tooltip and contain no interactive controls.

## Cleanup and limitations

Binding owns trigger listeners, timers, positioning observation, and Escape handling. Destroy cancels pending timers and clears the scope entry.

Hover delay, focus, and shared-scope examples execute from the shared [`createExample()` source](../../apps/demo/src/examples/create-example.ts).
