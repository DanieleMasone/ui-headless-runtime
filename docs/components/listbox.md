# Listbox

## Overview

Single and multi-selection with active-descendant navigation.

Pattern: Listbox. Status: stable.

## When to use

- Single or multiple option selection with active-descendant navigation.
- Virtual or custom-rendered lists where the input focus should remain on the listbox container.

## When not to use

- Editable autocomplete; use Combobox.
- Menu actions that do not represent selected values.

## Import

```ts
import { createListbox } from 'ui-headless-runtime';
```

## Controller creation

Create Listbox during component mount or setup, subscribe before rendering derived UI, and keep every cleanup returned by registrations or DOM binding.

## Options

- Selection mode, controlled value, default value, disabled options, loop, and active-descendant IDs configure behavior.

## Snapshot

- Reports selected values, active option, option order, disabled state, and ARIA multiselect metadata.

## Commands

- `registerOption`, `select`, `toggle`, `setActive`, `handleKeyDown`, and `destroy` drive the listbox.

## Events

- Selection events include selected value(s), active option, and reason.

## Change reasons

- `keyboard`, `pointer`, `typeahead`, `selection`, `registration`, `programmatic`, and `controlled` are meaningful.

## Controlled mode

Controlled listboxes emit requested value arrays or scalar values and wait for committed props.

## Uncontrolled mode

Uncontrolled listboxes own selected value(s) and active option.

## DOM binding

- Register options as they render; apply active-descendant metadata to the focusable listbox element.

## Required markup

- Use `role="listbox"` and `role="option"` with visible option text.

## ARIA contract

- Apply `aria-selected`, `aria-disabled`, `aria-activedescendant`, and `aria-multiselectable` from the snapshot.

## Keyboard interaction

- Arrow keys: Move the active item, skipping disabled items.
- Home / End: Move to the first or last enabled item.
- Type characters: Move by normalized typeahead.

## Focus behavior

- Focus remains on the listbox container while Arrow keys update the active option.

## Nested behavior

- Listboxes are not overlay managers; pair with Popover only when you need anchored display.

## Cleanup

- Dynamic option removal recalculates active item and selected values.

## Complete example

```ts
import { createListbox } from 'ui-headless-runtime';

const controller = createListbox();
const unsubscribe = controller.subscribe((snapshot) => {
  console.log(snapshot);
});

console.log(controller.getSnapshot());
unsubscribe();
controller.destroy();
```

The production demo loads the exact executable module from [`apps/demo/src/examples/listbox.ts`](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/listbox.ts).

## Edge cases

- `single`: One selected value.
- `multiple`: Selection toggles independently.
- `disabled`: Unavailable options are skipped.

## Limitations

- Filtering and typed input are Combobox responsibilities.

## Related links

- [Live demo](https://DanieleMasone.github.io/ui-headless-runtime/#/components/listbox)
- [User Guide: controllers](../guide/controllers)
- [User Guide: rendering contract](../guide/rendering-contract)

## API reference

See [`createListbox`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createListbox.html).
