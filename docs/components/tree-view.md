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

- Public options: `defaultExpandedIds`, `defaultSelectedIds`, `getExpandedIds`, `getSelectedIds`, `multiple`, `onExpandedIdsChange`, `onSelectedIdsChange`, `subscribeExpandedIds`, `subscribeSelectedIds`.
- Parent relationships, disabled state, child availability, loading state, IDs, and text belong to each registered `TreeNode`.

## Snapshot

- Snapshot fields: `activeId`, `ariaMultiselectable`, `expandedIds`, `expansionControlled`, `role`, `selectedIds`, `selectionControlled`, `visibleNodes`.
- Visible node snapshots expose `id`, `parentId`, `level`, `setSize`, `positionInSet`, `expanded`, `selected`, `disabled`, `loading`, `role`, and `tabIndex`.

## Commands

- Component commands: `handleKeyDown`, `registerNode`, `select`, `setActive`, `toggle`.
- Expansion and collapse both use `toggle(id, details)`; there are no separate public `expand` or `collapse` commands.

## Events

- Events: `beforeExpand`, `beforeSelect`, `expand`, `select`, `stateChange`.
- Payloads contain the affected registered node and typed change details.

## Change reasons

- Change reasons: `programmatic`, `pointer`, `keyboard`, `async-load`.

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
- Enter / Space: Select the active node.
- Type characters: Move by normalized typeahead.

## Focus behavior

- Up/Down move through visible nodes; Left/Right collapse, expand, or move to parent/child.

## Nested behavior

- Nested levels are computed from registry parent relationships rather than DOM walking.

## Cleanup

- Removing the active node chooses a valid visible neighbor and unregisters descendants.

## Minimal lifecycle example

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
