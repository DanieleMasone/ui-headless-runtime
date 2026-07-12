# Tabs

## Overview

Manual or automatic tab activation with RTL-aware navigation.

Pattern: Tabs. Status: stable.

## When to use

- Tabbed interfaces with manual or automatic activation and tab/panel relationships.
- Horizontal, vertical, and RTL-aware composites with disabled tabs and dynamic registration.

## When not to use

- Disclosure-style content where multiple panels may stay open.
- Navigation to separate pages; use links or Navigation Menu.

## Import

```ts
import { createTabs } from 'ui-headless-runtime';
```

## Controller creation

Create Tabs during component mount or setup, subscribe before rendering derived UI, and keep every cleanup returned by registrations or DOM binding.

## Options

- Public options: `activation`, `id`, `loop`, `orientation`, `rtl`, `defaultValue`, `getValue`, `onValueChange`, `subscribeValue`.
- `activation` is `automatic` or `manual`; `orientation` is `horizontal` or `vertical`.

## Snapshot

- Snapshot fields: `activation`, `controlled`, `focusedId`, `items`, `orientation`, `selectedId`.
- Each tab snapshot contains `id`, `tabId`, `panelId`, `selected`, `disabled`, and `tabIndex`.

## Commands

- Component commands: `focus`, `handleKeyDown`, `registerTab`, `select`.

## Events

- Events: `beforeSelect`, `select`, `stateChange`.
- Payloads contain the selected ID and typed details; `beforeSelect` is cancellable.

## Change reasons

- Change reasons: `programmatic`, `pointer`, `keyboard`, `focus`.

## Controlled mode

Controlled tabs keep selection in a parent store while the controller manages focus and requested changes.

## Uncontrolled mode

Uncontrolled tabs own selected and focused tab IDs and update snapshots immediately.

## DOM binding

- Register every tab with its panel ID and release the registration when either side unmounts.

## Required markup

- Use a `tablist`, `tab`, and `tabpanel` structure with hidden inactive panels as appropriate.

## ARIA contract

- Apply `aria-selected`, `aria-controls`, `aria-labelledby`, and roving `tabindex` from the snapshot.

## Keyboard interaction

- Arrow keys: Move the active item, skipping disabled items.
- Home / End: Move to the first or last enabled item.
- Type characters: Move by normalized typeahead.

## Focus behavior

- Automatic mode selects as focus moves; manual mode waits for Enter or Space.

## Nested behavior

- Nested tabsets should use independent controllers so roving focus scopes do not collide.

## Cleanup

- Removing the selected tab chooses the next valid tab or clears selection when none remain.

## Minimal lifecycle example

```ts
import { createTabs } from 'ui-headless-runtime';

const controller = createTabs();
const unsubscribe = controller.subscribe((snapshot) => {
  console.log(snapshot);
});

console.log(controller.getSnapshot());
unsubscribe();
controller.destroy();
```

The production demo loads the exact executable module from [`apps/demo/src/examples/tabs.ts`](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/tabs.ts).

## Edge cases

- `automatic`: Selection follows roving focus.
- `manual`: Enter or Space commits selection.
- `vertical`: Up and Down replace horizontal arrows.

## Limitations

- The runtime does not lazy-load panel content; consumers decide rendering policy.

## Related links

- [Live demo](https://DanieleMasone.github.io/ui-headless-runtime/#/components/tabs)
- [User Guide: controllers](../guide/controllers)
- [User Guide: rendering contract](../guide/rendering-contract)

## API reference

See [`createTabs`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createTabs.html).
