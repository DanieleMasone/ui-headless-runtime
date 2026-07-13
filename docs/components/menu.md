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

- Public options: `closeOnSelect`, `id`, `loop`, `positioning`, `defaultValue`, `getValue`, `onValueChange`, `subscribeValue`.
- Disabled state, separators, submenu relationships, IDs, text, and values belong to registered `MenuItem` objects. Menu orientation is fixed by the menu keyboard model.

## Snapshot

- Snapshot fields: `activeId`, `contentId`, `controlled`, `items`, `open`, `openSubmenuId`, `position`, `role`, `selectedId`.
- The internal typeahead buffer is not public snapshot state.

## Commands

- Component commands: `bind`, `close`, `handleKeyDown`, `open`, `registerItem`, `registerSubmenu`, `select`, `setActive`, `toggle`.
- Arrow movement, Home/End, typeahead, and submenu opening are handled through `handleKeyDown`; they are not separate public commands.

## Events

- Events: `beforeClose`, `beforeOpen`, `close`, `open`, `afterClose`, `afterOpen`, `beforeSelect`, `select`, `stateChange`.
- `beforeSelect` and inherited before-open/close events are cancellable.

## Change reasons

- Change reasons: `pointer`, `keyboard`, `programmatic`, `trigger`, `escape-key`, `outside-pointer`, `focus-out`, `selection`, `context-menu`, `hover`, `focus`.
- Selection uses `MenuSelectReason`; open-state lifecycle uses `OpenChangeReason`.

## Controlled mode

Only open state is consumer-controlled through `getValue`, `onValueChange`, and `subscribeValue`. Active item navigation, `selectedId`, and submenu state remain controller-owned.

## Uncontrolled mode

The controller owns open state, active item, typeahead buffer, `selectedId`, and submenu state.

## DOM binding

- Register each item with text value, disabled state, and separator/submenu metadata.

## Required markup

- Use menu roles; separators are structural and should never become active items.

## ARIA contract

- Apply menuitem roles, disabled state, checked state when applicable, and submenu relationships.

## Keyboard interaction

- ArrowDown / ArrowUp: Move the active item, skipping disabled items.
- Home / End: Move to the first or last enabled item.
- Enter / Space: Activate the active item or open its submenu.
- ArrowRight / ArrowLeft: Open or close a submenu.
- Type characters: Move by normalized typeahead.
- Escape: Close the topmost menu and restore focus when configured.
- Tab / Shift+Tab: Close the menu without suppressing native focus traversal.

## Focus behavior

- Roving focus moves among enabled items and skips separators.

## Nested behavior

- Submenu parent/child links use the same engine, keeping ArrowRight/ArrowLeft behavior predictable.

## Cleanup

- Unregister items on unmount so item order and active fallback stay valid.

## Minimal lifecycle example

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

## Related links

- [Live demo](https://DanieleMasone.github.io/ui-headless-runtime/#/components/menu)
- [User Guide: controllers](../guide/controllers)
- [User Guide: rendering contract](../guide/rendering-contract)

## API reference

See [`createMenu`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createMenu.html).
