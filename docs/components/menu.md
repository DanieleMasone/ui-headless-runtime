# Menu

## Overview

Reusable item, submenu, disabled-state, and typeahead engine.

Pattern: Menu. Status: stable.

## When to use

- Reusable menu logic for actions, submenus, separators, disabled items, typeahead, and cancellable activation.
- Custom dropdown or context-menu renderers that need a shared item engine without trigger assumptions.

## When not to use

- Form selection controls; use Listbox or Combobox.
- Freeform content panels without menuitem semantics.

## Import

```ts
import { createMenu } from 'ui-headless-runtime';
```

## Controller creation

Create Menu during component mount or setup, subscribe before rendering derived UI, and keep every cleanup returned by registrations or DOM binding.

## Options

- Looping, orientation, disabled items, submenu relationships, selected IDs, and typeahead behavior configure navigation.

## Snapshot

- Contains item order, active item, selected IDs, submenu state, typeahead buffer, and ARIA item metadata.

## Commands

- `registerItem`, `setActive`, `move`, `select`, `openSubmenu`, `closeSubmenu`, and `handleKeyDown` are primary.

## Events

- Activation events are cancellable and include the selected item plus reason.

## Change reasons

- `keyboard`, `pointer`, `typeahead`, `submenu`, `selection`, `registration`, and `programmatic` explain changes.

## Controlled mode

Selection can be controlled externally while active item navigation remains local to the current menu surface.

## Uncontrolled mode

The controller owns active item, typeahead buffer, and optional selected state.

## DOM binding

- Register each item with text value, disabled state, and separator/submenu metadata.

## Required markup

- Use menu roles; separators are structural and should never become active items.

## ARIA contract

- Apply menuitem roles, disabled state, checked state when applicable, and submenu relationships.

## Keyboard interaction

- Arrow keys: Move the active item, skipping disabled items.
- Home / End: Move to the first or last enabled item.
- Type characters: Move by normalized typeahead.

## Focus behavior

- Roving focus moves among enabled items and skips separators.

## Nested behavior

- Submenu parent/child links use the same engine, keeping ArrowRight/ArrowLeft behavior predictable.

## Cleanup

- Unregister items on unmount so item order and active fallback stay valid.

## Complete example

```ts
import { createMenu } from 'ui-headless-runtime';

const controller = createMenu();
const unsubscribe = controller.subscribe((snapshot) => {
  console.log(snapshot);
});

console.log(controller.getSnapshot());
unsubscribe();
controller.destroy();
```

The production demo loads the exact executable module from [`apps/demo/src/examples/menu.ts`](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/menu.ts).

## Edge cases

- `actions`: Cancellable selection lifecycle.
- `typeahead`: Normalized text lookup.
- `long`: Loop behavior is configurable.

## Limitations

- It does not impose visual layout or action side effects.

## API reference

See [`createMenu`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createMenu.html).
