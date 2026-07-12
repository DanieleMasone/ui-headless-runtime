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

- Public options: `closeDelay`, `mode`, `openDelay`, `positioning`, `defaultValue`, `getValue`, `onValueChange`, `subscribeValue`.
- IDs, disabled state, text, values, submenu metadata, and `hasContent` belong to each registered `NavigationMenuItem`.

## Snapshot

- Snapshot fields: `activeId`, `controlled`, `items`, `mode`, `openId`, `position`.
- Delay timers and consumer ARIA relationships are not exposed as snapshot fields.

## Commands

- Component commands: `bind`, `close`, `handleKeyDown`, `openItem`, `registerItem`, `scheduleClose`, `scheduleOpen`, `setMode`.
- `handleKeyDown(event)` infers the registered item from `event.currentTarget`; `handleKeyDown(itemId, event)` is the explicit framework-forwarding overload. There are no public `open` or `toggle` commands.

## Events

- Events: `beforeClose`, `beforeOpen`, `close`, `open`, `stateChange`.
- Events contain the affected item, resulting `openId`, and typed details.

## Change reasons

- Change reasons: `programmatic`, `pointer`, `keyboard`, `outside-pointer`.

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

- Enter / Space / ArrowDown / ArrowUp: Open content from the registered trigger.
- Arrow keys: Move between registered items while content is open, skipping disabled items.
- Home / End: Move to the first or last enabled item while content is open.
- Type characters: Move by normalized typeahead while content is open.
- Escape: Close the current content.

## Focus behavior

- Opening preserves the current trigger as the active item. Navigation keys move DOM focus through registered item elements while content is open; Escape closes content without choosing a responsive breakpoint.

## Nested behavior

- Mega content may contain nested links or disclosure content, but each nested controller should manage its own cleanup.

## Cleanup

- Clear delayed open/close timers and unregister items when navigation changes.

## Minimal lifecycle example

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

## Related links

- [Live demo](https://DanieleMasone.github.io/ui-headless-runtime/#/components/navigation-menu)
- [User Guide: controllers](../guide/controllers)
- [User Guide: rendering contract](../guide/rendering-contract)

## API reference

See [`createNavigationMenu`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createNavigationMenu.html).
