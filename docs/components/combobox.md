# Combobox

## Overview

Editable autocomplete with async race protection and IME support.

Pattern: Combobox. Status: stable.

## When to use

- Editable autocomplete where input value, query, selected value, and displayed option are separate.
- Async suggestions that need stale-response protection and loading/empty states.

## When not to use

- Static selection without text entry; use Listbox.
- Command launchers where selected command side effects matter more than a value.

## Import

```ts
import { createCombobox } from 'ui-headless-runtime';
```

## Controller creation

Create Combobox during component mount or setup, subscribe before rendering derived UI, and keep every cleanup returned by registrations or DOM binding.

## Options

- Filtering, async suggestions, display value, controlled input/selected state, placement, and IME handling configure behavior.

## Snapshot

- Contains input value, query, selected value, active option, suggestions, loading, no-results state, and popup metadata.

## Commands

- `setInputValue`, `setQuery`, `registerOption`, `select`, `open`, `close`, `handleInput`, `handleKeyDown`, and composition handlers are central.

## Events

- Input, query, option, async loading, stale-response, and selection transitions are observable.

## Change reasons

- `input`, `keyboard`, `pointer`, `filter`, `async`, `stale`, `selection`, `composition`, and `controlled` matter.

## Controlled mode

Controlled comboboxes can own input and selected value separately; pass both committed values back to the controller.

## Uncontrolled mode

Uncontrolled mode owns input text, query, active option, and selected value while still accepting async providers.

## DOM binding

- Bind the input and popup listbox; register options from current suggestions or virtualized rows.

## Required markup

- Use a text input with combobox metadata and a listbox popup for suggestions.

## ARIA contract

- Apply `aria-expanded`, `aria-controls`, `aria-activedescendant`, and option selected/disabled state.

## Keyboard interaction

- ArrowDown / ArrowUp: Navigate suggestions.
- Enter: Commit the active suggestion.
- Escape: Close suggestions.

## Focus behavior

- The input keeps DOM focus; Arrow keys move active option and Enter commits selection.

## Nested behavior

- The popup can use positioning, but nested interactive overlays inside options are not part of the combobox contract.

## Cleanup

- Abort or ignore stale async responses and release composition/input listeners during unmount.

## Complete example

```ts
import { createCombobox } from 'ui-headless-runtime';

const controller = createCombobox();
const unsubscribe = controller.subscribe((snapshot) => {
  console.log(snapshot);
});

console.log(controller.getSnapshot());
unsubscribe();
controller.destroy();
```

The production demo loads the exact executable module from [`apps/demo/src/examples/combobox.ts`](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/combobox.ts).

## Edge cases

- `local`: Fuzzy matching over registered options.
- `async`: Stale responses cannot replace a newer query.
- `empty`: Loading and empty state are distinct.

## Limitations

- The runtime does not debounce network calls automatically; consumers choose fetch policy.

## API reference

See [`createCombobox`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createCombobox.html).
