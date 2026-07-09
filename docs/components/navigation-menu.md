# Navigation Menu

## Overview

Simple and mega-menu content with consumer-selected responsive mode.

Pattern: Navigation Menu. Status: experimental.

## When to use

- Desktop or compact navigation surfaces with simple menus, mega panels, delayed open, and outside dismissal.
- Responsive systems where the consumer, not the runtime, decides breakpoint mode.

## When not to use

- Application command menus that should use Menu semantics only.
- Route-only link lists with no disclosure, positioning, or delay behavior.

## Import

```ts
import { createNavigationMenu } from 'ui-headless-runtime';
```

## Controller creation

Create Navigation Menu during component mount or setup, subscribe before rendering derived UI, and keep every cleanup returned by registrations or DOM binding.

## Options

- Mode, delay, controlled open item, placement, item registration, and nested content options configure navigation.

## Snapshot

- Reports active/open item, mode, registered items, placement metadata, delay state, and ARIA relationships.

## Commands

- `registerItem`, `scheduleOpen`, `scheduleClose`, `open`, `close`, `toggle`, and `handleKeyDown` are central.

## Events

- Open/close events identify pointer intent, keyboard movement, outside dismissal, and mode changes.

## Change reasons

- `pointer`, `keyboard`, `delay`, `outside`, `selection`, `mode`, `programmatic`, and `controlled` are useful.

## Controlled mode

Controlled navigation menus let the app shell own responsive mode and active route while runtime handles interaction.

## Uncontrolled mode

Uncontrolled mode owns open item and delayed pointer intent.

## DOM binding

- Register navigation items and bind content panels to positioning and outside-interaction cleanup.

## Required markup

- Use semantic navigation links/buttons and labelled panel content.

## ARIA contract

- Expose expanded state and relationships for items with panels; plain links remain links.

## Keyboard interaction

- Arrow keys: Move the active item, skipping disabled items.
- Home / End: Move to the first or last enabled item.
- Type characters: Move by normalized typeahead.

## Focus behavior

- Arrow keys move between registered items; Escape closes open content and returns focus appropriately.

## Nested behavior

- Mega content may contain nested links or disclosure content, but each nested controller should manage its own cleanup.

## Cleanup

- Clear delayed open/close timers and unregister items when navigation changes.

## Complete example

```ts
import { createNavigationMenu } from 'ui-headless-runtime';

const controller = createNavigationMenu();
const unsubscribe = controller.subscribe((snapshot) => {
  console.log(snapshot);
});

console.log(controller.getSnapshot());
unsubscribe();
controller.destroy();
```

The production demo loads the exact executable module from [`apps/demo/src/examples/navigation-menu.ts`](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/navigation-menu.ts).

## Edge cases

- `desktop`: Delayed pointer intent.
- `compact`: Immediate expansion controlled by the consumer.
- `mega`: Nested content uses shared positioning.

## Limitations

- The runtime does not choose responsive breakpoints or mobile drawer layout.

## API reference

See [`createNavigationMenu`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createNavigationMenu.html).
