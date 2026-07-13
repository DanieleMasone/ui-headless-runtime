# Dropdown Menu

## Overview

Trigger-driven actions using the shared Menu engine.

Pattern: Menu Button. Status: stable.

## When to use

- Action lists opened from a trigger button with Menu Button keyboard behavior.
- Submenu trees where disabled items, separators, typeahead, and restore focus must be consistent.

## When not to use

- Freeform content panels; use Popover when items are not menu actions.
- Selection controls that should expose listbox semantics.

## Import

```ts
import { createDropdownMenu } from 'ui-headless-runtime';
```

## Controller creation

Create Dropdown Menu during component mount or setup, subscribe before rendering derived UI, and keep every cleanup returned by registrations or DOM binding.

## Options

- Public options: `closeOnSelect`, `id`, `loop`, `positioning`, `defaultValue`, `getValue`, `onValueChange`, `subscribeValue`.
- Dropdown Menu accepts `MenuOptions`. Trigger behavior comes from `handleTrigger`; disabled items and submenu metadata belong to registrations.

## Snapshot

- Snapshot fields: `activeId`, `contentId`, `controlled`, `items`, `open`, `openSubmenuId`, `position`, `role`, `selectedId`.
- Trigger ARIA attributes are applied by the consumer from `open` and `contentId`; they are not a separate snapshot object.

## Commands

- Component commands: `bind`, `close`, `handleKeyDown`, `open`, `registerItem`, `registerSubmenu`, `select`, `setActive`, `toggle`, `handleTrigger`.

## Events

- Events: `beforeClose`, `beforeOpen`, `close`, `open`, `afterClose`, `afterOpen`, `beforeSelect`, `select`, `stateChange`.
- Menu selection and open/close lifecycle events are shared with Menu.

## Change reasons

- Change reasons: `pointer`, `keyboard`, `programmatic`, `trigger`, `escape-key`, `outside-pointer`, `focus-out`, `selection`, `context-menu`, `hover`, `focus`.

## Controlled mode

A controlled dropdown can mirror open state from an external navigation shell while still using runtime item navigation.

## Uncontrolled mode

The usual case lets the controller own open state and active item movement.

## DOM binding

- Bind the trigger and menu content; register each menu item with text, disabled state, and optional submenu metadata.

## Required markup

- Use `role="menu"` with menuitem descendants; separators must not be focusable.

## ARIA contract

- Apply `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`, and item disabled/checked metadata from snapshots.

## Keyboard interaction

- Enter / Space / ArrowDown / ArrowUp: Open the menu from its trigger.
- ArrowDown / ArrowUp: Move the active item, skipping disabled items.
- Home / End: Move to the first or last enabled item.
- Enter / Space: Activate the active item or open its submenu.
- ArrowRight / ArrowLeft: Open or close a submenu.
- Type characters: Move by normalized typeahead.
- Escape: Close the topmost menu and restore trigger focus.
- Tab / Shift+Tab: Close the menu without suppressing native focus traversal.

## Focus behavior

- Keyboard opening moves focus to the first enabled item; pointer opening can preserve trigger focus until item interaction.

## Nested behavior

- Submenus use the same menu engine and overlay stack so parent menus remain open while focus is inside descendants.

## Cleanup

- Unregister items and submenu branches when DOM changes, then release trigger/content listeners.

## Minimal lifecycle example

```ts
import { createDropdownMenu } from 'ui-headless-runtime';

const controller = createDropdownMenu();
const unsubscribe = controller.subscribe((snapshot) => {
  console.log(snapshot);
});

console.log(controller.getSnapshot());
unsubscribe();
controller.destroy();
```

The production demo loads the exact executable module from [`apps/demo/src/examples/dropdown-menu.ts`](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/dropdown-menu.ts).

## Edge cases

- `basic`: Pointer and keyboard trigger activation.
- `disabled`: Navigation skips unavailable actions.
- `submenu`: ArrowRight requests nested content.

## Limitations

- It does not render icons, shortcuts, or checkmarks; those remain consumer markup.

## Related links

- [Live demo](https://DanieleMasone.github.io/ui-headless-runtime/#/components/dropdown-menu)
- [User Guide: controllers](../guide/controllers)
- [User Guide: rendering contract](../guide/rendering-contract)

## API reference

See [`createDropdownMenu`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createDropdownMenu.html).
