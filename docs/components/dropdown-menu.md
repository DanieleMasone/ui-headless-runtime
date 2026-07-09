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

- Trigger behavior, menu item registration, placement, loop, disabled state, and submenu configuration are layered over the shared Menu engine.

## Snapshot

- Combines trigger open state with active item, registered items, selected values, placement, and ARIA metadata.

## Commands

- `open`, `close`, `toggle`, `registerItem`, `handleTrigger`, `handleKeyDown`, and `select` are the main commands.

## Events

- Activation and selection events can be cancelled before action side effects run.

## Change reasons

- `trigger`, `keyboard`, `pointer`, `typeahead`, `submenu`, `selection`, and `outside` explain navigation and dismissal.

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

- Arrow keys: Move the active item, skipping disabled items.
- Home / End: Move to the first or last enabled item.
- Type characters: Move by normalized typeahead.

## Focus behavior

- Keyboard opening moves focus to the first enabled item; pointer opening can preserve trigger focus until item interaction.

## Nested behavior

- Submenus use the same menu engine and overlay stack so parent menus remain open while focus is inside descendants.

## Cleanup

- Unregister items and submenu branches when DOM changes, then release trigger/content listeners.

## Complete example

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

## API reference

See [`createDropdownMenu`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createDropdownMenu.html).
