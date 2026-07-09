# Tree View

## Overview

Hierarchical expansion, selection, and computed set metadata.

Pattern: Tree View. Status: stable.

## When to use

- Hierarchical data with expansion, selection, disabled nodes, typeahead, and computed set metadata.
- Dynamic trees where active-node removal and async loading must keep navigation valid.

## When not to use

- Flat option lists; use Listbox.
- Site navigation with flyout panels; use Navigation Menu.

## Import

```ts
import { createTreeView } from 'ui-headless-runtime';
```

## Controller creation

Create Tree View during component mount or setup, subscribe before rendering derived UI, and keep every cleanup returned by registrations or DOM binding.

## Options

- Selection mode, expanded IDs, disabled nodes, async loading markers, loop, and direction configure traversal.

## Snapshot

- Reports visible preorder nodes, active node, selected IDs, expanded IDs, level, set size, position in set, and loading state.

## Commands

- `registerNode`, `expand`, `collapse`, `toggle`, `select`, `setActive`, and `handleKeyDown` drive the tree.

## Events

- Expansion and selection events include node ID, parent relationships, and reason.

## Change reasons

- `keyboard`, `pointer`, `typeahead`, `expand`, `collapse`, `selection`, `registration`, and `async` are key.

## Controlled mode

Controlled trees can own selected and expanded IDs while the runtime computes visible traversal.

## Uncontrolled mode

Uncontrolled trees own selected, expanded, and active IDs.

## DOM binding

- Register each node with parent ID, text value, disabled state, and loading state.

## Required markup

- Use tree/treeitem/group semantics and render children only when expanded or intentionally virtualized.

## ARIA contract

- Apply `aria-expanded`, `aria-selected`, `aria-level`, `aria-setsize`, `aria-posinset`, and disabled metadata.

## Keyboard interaction

- Up / Down: Move through visible nodes.
- Left / Right: Collapse, expand, or move parent/child.
- Home / End: Move to tree edges.

## Focus behavior

- Up/Down move through visible nodes; Left/Right collapse, expand, or move to parent/child.

## Nested behavior

- Nested levels are computed from registry parent relationships rather than DOM walking.

## Cleanup

- Removing the active node chooses a valid visible neighbor and unregisters descendants.

## Complete example

```ts
import { createTreeView } from 'ui-headless-runtime';

const controller = createTreeView();
const unsubscribe = controller.subscribe((snapshot) => {
  console.log(snapshot);
});

console.log(controller.getSnapshot());
unsubscribe();
controller.destroy();
```

The production demo loads the exact executable module from [`apps/demo/src/examples/tree-view.ts`](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/tree-view.ts).

## Edge cases

- `nested`: Visible preorder traversal.
- `disabled`: Navigation skips disabled nodes.
- `dynamic`: Active-node removal chooses a valid neighbor.

## Limitations

- The runtime does not fetch child data; it only records loading state and ignores stale registrations.

## Related links

- [Live demo](https://DanieleMasone.github.io/ui-headless-runtime/#/components/tree-view)
- [User Guide: controllers](../guide/controllers)
- [User Guide: rendering contract](../guide/rendering-contract)

## API reference

See [`createTreeView`](https://DanieleMasone.github.io/ui-headless-runtime/api/functions/createTreeView.html).
