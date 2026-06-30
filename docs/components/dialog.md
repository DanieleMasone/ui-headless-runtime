# Dialog

## Overview and use cases

Use Dialog for interruptive tasks, confirmations, or focused workflows. Prefer inline Disclosure for content that does not need an overlay or focus scope.

## Options and snapshot

`DialogOptions` controls modal behavior, external or internal open state, outside/Escape dismissal, initial focus, restoration, and deterministic ID. `DialogSnapshot` exposes open/controlled/topmost state, role, modal/backdrop metadata, and positioning.

## Commands, events, and reasons

`open`, `close`, `toggle`, and `bind` are typed. `beforeOpen`/`beforeClose` are cancellable; accepted transitions emit open/close, after*, and stateChange. Reasons include programmatic, trigger, Escape, outside pointer, focus out, and selection.

## Controlled and uncontrolled

Use `defaultValue` for internal state or `getValue`, `onValueChange`, and optional `subscribeValue` for external state.

## DOM, ARIA, keyboard, and focus

Render a labelled `role=dialog`; apply `aria-modal` from the snapshot. Modal binding traps Tab, sets initial/fallback focus, inerts siblings, locks scroll, and restores a connected target. Only the topmost nested dialog handles Escape.

## Cleanup, edge cases, and limitations

Release `bind()` and call `destroy()`. Removed triggers, no tabbables, invalid focus targets, nested dialogs, programmatic close, and double destroy are safe. The consumer supplies the accessible name and backdrop markup.

The modal, non-modal, nested, and no-tabbable examples use the production controller through the shared [`createExample()` source](../../apps/demo/src/examples/create-example.ts).
