# Context Menu

## Overview

Pointer or Shift+F10 menu with a virtual anchor.

Pattern: Menu. Status: stable.

## When to use

- Contextual actions opened at pointer coordinates or from Shift+F10/ContextMenu key.
- Virtual-anchor placement where no persistent trigger element exists.

## When not to use

- Always-visible command bars or trigger-button menus; use Menu or Dropdown Menu instead.

## Import

```ts
import { createContextMenu } from 'ui-headless-runtime';
```

## Controller creation

Create Context Menu during component mount or setup, subscribe before rendering derived UI, and keep every cleanup returned by registrations or DOM binding.

## Options

- Coordinate opening, virtual anchor placement, native-menu prevention, and item registration come from Context Menu plus Menu engine options.

## Snapshot

- Tracks open state, virtual anchor coordinates, active item, menu IDs, and item metadata.

## Commands

- `openAt`, `close`, `registerItem`, `handleContextMenu`, `handleKeyDown`, and `select` drive the interaction.

## Events

- Selection is cancellable and native context-menu prevention is scoped to active handlers only.

## Change reasons

- `contextmenu`, `keyboard`, `pointer`, `selection`, `outside`, and `programmatic` are the important branches.

## Controlled mode

External owners can accept or reject context opening while preserving the latest requested coordinates.

## Uncontrolled mode

Uncontrolled mode opens immediately at the current pointer or keyboard-derived virtual anchor.

## DOM binding

- Attach the contextmenu and keydown handlers to the region that owns the contextual actions.

## Required markup

- Render the menu content near the virtual anchor and use normal menu roles for items.

## ARIA contract

- Use menu roles and disabled metadata; the trigger relationship is contextual rather than a fixed button relationship.

## Keyboard interaction

- Arrow keys: Move the active item, skipping disabled items.
- Home / End: Move to the first or last enabled item.
- Type characters: Move by normalized typeahead.

## Focus behavior

- Keyboard opening moves into the menu; pointer opening keeps placement at the pointer and then follows menu focus rules.

## Nested behavior

- Submenus reuse the shared Menu stack, including disabled skipping and typeahead.

## Cleanup

- Release region listeners and unregister items so native context menus are restored after unmount.

## Complete example

```ts
import { createContextMenu } from 'ui-headless-runtime';

const controller = createContextMenu();
const unsubscribe = controller.subscribe((snapshot) => {
  console.log(snapshot);
});

console.log(controller.getSnapshot());
unsubscribe();
controller.destroy();
```

The production demo loads the exact executable module from [`apps/demo/src/examples/context-menu.ts`](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/context-menu.ts).

## Edge cases

- `pointer`: Open at contextmenu coordinates.
- `keyboard`: Open from Shift+F10 or ContextMenu.
- `submenu`: Nested actions reuse Menu navigation.

## Limitations

- Browser or OS context-menu behavior outside the bound region is intentionally untouched.

## API reference

See [`createContextMenu`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createContextMenu.html).
