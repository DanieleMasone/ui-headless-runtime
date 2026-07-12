# Command Palette

## Overview

Modal fuzzy command search with a configurable shortcut.

Pattern: Dialog plus Listbox. Status: stable.

## When to use

- Global command search with a configurable shortcut, grouping, disabled commands, and fuzzy matching.
- Documentation or app launchers where Dialog focus behavior and collection navigation should be reused.

## When not to use

- Plain site search that navigates to remote results without command execution.
- Combobox inputs where freeform typed value is the product data.

## Import

```ts
import { createCommandPalette } from 'ui-headless-runtime';
```

## Controller creation

Create Command Palette during component mount or setup, subscribe before rendering derived UI, and keep every cleanup returned by registrations or DOM binding.

## Options

- Public options: `defaultQuery`, `dialog`, `getQuery`, `matcher`, `onQueryChange`, `shortcut`, `subscribeQuery`.
- Command grouping, disabled state, keywords, and actions belong to each registered `CommandItem`. Controlled open state is configured through the nested `dialog` options.

## Snapshot

- Snapshot fields: `activeId`, `commands`, `empty`, `open`, `openControlled`, `query`, `queryControlled`.
- Dialog IDs and position are not part of `CommandPaletteSnapshot`; consumers bind their own dialog elements.

## Commands

- Component commands: `bind`, `bindShortcut`, `close`, `handleKeyDown`, `open`, `registerCommand`, `select`, `setQuery`.
- The controller has no public `toggle` command.

## Events

- Events: `beforeClose`, `beforeOpen`, `close`, `open`, `afterClose`, `afterOpen`, `beforeSelect`, `queryChange`, `select`, `stateChange`.
- Selection payloads contain the registered command and typed details; query events contain the next query.

## Change reasons

- Change reasons: `programmatic`, `input`, `keyboard`, `pointer`, `shortcut`, `trigger`, `escape-key`, `outside-pointer`, `focus-out`, `selection`, `context-menu`, `hover`, `focus`.
- Palette query/selection commands use `CommandPaletteReason`; inherited dialog lifecycle events use `OpenChangeReason`.

## Controlled mode

Controlled palettes can keep query/open state in a router or app store while using runtime filtering.

## Uncontrolled mode

Uncontrolled palettes own open state, query, active item, and filtered command list.

## DOM binding

- Bind trigger, dialog content, input, and result options; register commands outside rendering loops when possible.

## Required markup

- Render the palette as a labelled dialog with a listbox-like result area.

## ARIA contract

- Use Dialog metadata plus active option state for results; disabled commands must remain announced correctly.

## Keyboard interaction

- Control/Command+K: Toggle the palette.
- Arrow keys: Move the active item, skipping disabled items.
- Home / End: Move to the first or last enabled item.
- Type characters: Move by normalized typeahead.

## Focus behavior

- Opening moves focus to the search input; Arrow keys move active command; Enter selects.

## Nested behavior

- Because it uses Dialog, nested overlays obey the same topmost Escape behavior.

## Cleanup

- Release shortcut listeners and command registrations before destroy.

## Minimal lifecycle example

```ts
import { createCommandPalette } from 'ui-headless-runtime';

const controller = createCommandPalette();
const unsubscribe = controller.subscribe((snapshot) => {
  console.log(snapshot);
});

console.log(controller.getSnapshot());
unsubscribe();
controller.destroy();
```

The production demo loads the exact executable module from [`apps/demo/src/examples/command-palette.ts`](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/command-palette.ts).

## Edge cases

- `search`: Fuzzy score filters commands.
- `groups`: Commands retain group metadata.
- `empty`: No-match state is explicit.

## Limitations

- It does not index remote documents or perform async fetching; consumers provide commands.

## Related links

- [Live demo](https://DanieleMasone.github.io/ui-headless-runtime/#/components/command-palette)
- [User Guide: controllers](../guide/controllers)
- [User Guide: rendering contract](../guide/rendering-contract)

## API reference

See [`createCommandPalette`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createCommandPalette.html).
