import { findTypeaheadMatch, type CollectionItem } from '../collections/collection';
import { createControllerHost } from '../core/host';
import { createTimeoutManager } from '../core/timers';
import type { ChangeDetails, EventSource, RuntimeController } from '../core/types';
import { createControllableValue } from '../state/controllable';

/** Causes of tree expansion, focus, and selection mutations. @public */
export type TreeChangeReason = 'programmatic' | 'pointer' | 'keyboard' | 'async-load';

/** Hierarchical Tree View node registration. @public */
export interface TreeNode extends CollectionItem {
  /** Parent node ID, or `null` for a root node. */
  readonly parentId?: string | null;
  /** Whether the node can expose children, including asynchronously loaded children. */
  readonly hasChildren?: boolean;
  /** Whether child registration is currently pending. */
  readonly loading?: boolean;
}

/** Immutable visible treeitem semantics. @public */
export interface TreeNodeSnapshot {
  /** Stable node ID. */
  readonly id: string;
  /** Parent node ID. */
  readonly parentId: string | null;
  /** Visible hierarchy level, starting at one. */
  readonly level: number;
  /** Sibling count for `aria-setsize`. */
  readonly setSize: number;
  /** One-based sibling position for `aria-posinset`. */
  readonly positionInSet: number;
  /** Expansion state for branch nodes. */
  readonly expanded: boolean;
  /** Selection state. */
  readonly selected: boolean;
  /** Disabled state. */
  readonly disabled: boolean;
  /** Whether the branch is waiting for asynchronous children. */
  readonly loading: boolean;
  /** Roving tabindex value. */
  readonly tabIndex: 0 | -1;
  /** Treeitem role for consumer markup. */
  readonly role: 'treeitem';
}

/** Immutable Tree View snapshot. @public */
export interface TreeSnapshot {
  /** Keyboard-active node ID. */
  readonly activeId: string | null;
  /** Ordered expanded branch IDs. */
  readonly expandedIds: readonly string[];
  /** Ordered selected node IDs. */
  readonly selectedIds: readonly string[];
  /** Whether expansion state is consumer-owned. */
  readonly expansionControlled: boolean;
  /** Whether selection state is consumer-owned. */
  readonly selectionControlled: boolean;
  /** Visible preorder treeitem metadata. */
  readonly visibleNodes: readonly TreeNodeSnapshot[];
  /** Tree role for consumer markup. */
  readonly role: 'tree';
  /** Whether multiple selection is enabled. */
  readonly ariaMultiselectable: boolean;
}

/** Tree lifecycle payload. @public */
export interface TreeChangeEvent {
  /** Node that initiated the transition. */
  readonly node: Readonly<TreeNode>;
  /** Typed cause and optional native event. */
  readonly details: ChangeDetails<TreeChangeReason>;
}

/** Tree expansion and selection event map. @public */
export interface TreeEvents {
  /** Cancellable event emitted before a branch changes expansion. */
  readonly beforeExpand: TreeChangeEvent;
  /** Event emitted after expansion changes. */
  readonly expand: TreeChangeEvent;
  /** Cancellable event emitted before selection changes. */
  readonly beforeSelect: TreeChangeEvent;
  /** Event emitted after selection changes. */
  readonly select: TreeChangeEvent;
  /** Event emitted for accepted expansion or selection changes. */
  readonly stateChange: TreeChangeEvent;
}

/** Tree View state ownership and selection options. @public */
export interface TreeOptions {
  /** Enables selection of more than one node. @defaultValue `false` */
  readonly multiple?: boolean;
  /** Initial expanded IDs in uncontrolled mode. */
  readonly defaultExpandedIds?: readonly string[];
  /** Reads consumer-owned expanded IDs. */
  readonly getExpandedIds?: () => readonly string[];
  /** Receives accepted expansion requests. */
  readonly onExpandedIdsChange?: (
    ids: readonly string[],
    details: ChangeDetails<TreeChangeReason>,
  ) => void;
  /** Subscribes to external expansion changes. */
  readonly subscribeExpandedIds?: (listener: () => void) => () => void;
  /** Initial selected IDs in uncontrolled mode. */
  readonly defaultSelectedIds?: readonly string[];
  /** Reads consumer-owned selected IDs. */
  readonly getSelectedIds?: () => readonly string[];
  /** Receives accepted selection requests. */
  readonly onSelectedIdsChange?: (
    ids: readonly string[],
    details: ChangeDetails<TreeChangeReason>,
  ) => void;
  /** Subscribes to external selection changes. */
  readonly subscribeSelectedIds?: (listener: () => void) => () => void;
}

/** Headless hierarchical Tree View controller. @public */
export interface TreeController extends RuntimeController<TreeSnapshot>, EventSource<TreeEvents> {
  /** Registers or replaces a dynamic node and returns scoped cleanup. */
  registerNode(node: TreeNode): () => void;
  /** Expands or collapses a branch. */
  toggle(id: string, details?: ChangeDetails<TreeChangeReason>): void;
  /** Selects or toggles an enabled node. */
  select(id: string, details?: ChangeDetails<TreeChangeReason>): void;
  /** Moves the active node without changing selection. */
  setActive(id: string | null): void;
  /** Handles Up/Down/Left/Right, Home/End, typeahead, Enter, and Space. */
  handleKeyDown(event: KeyboardEvent): void;
}

/** Creates a dynamic Tree View with preorder traversal and computed hierarchy metadata. @public */
export function createTreeView(options: TreeOptions = {}): TreeController {
  const entries = new Map<string, { node: TreeNode; token: symbol; sequence: number }>();
  let sequence = 0;
  let activeId: string | null = null;
  let typeahead = '';
  const typeaheadTimer = createTimeoutManager();
  const childrenOf = (parentId: string | null): readonly TreeNode[] =>
    [...entries.values()]
      .filter(({ node }) => (node.parentId ?? null) === parentId)
      .sort((a, b) => a.sequence - b.sequence)
      .map(({ node }) => node);
  const flatten = (
    expandedIds: readonly string[],
  ): readonly { node: TreeNode; level: number }[] => {
    const result: { node: TreeNode; level: number }[] = [];
    const visit = (
      parentId: string | null,
      level: number,
      ancestors: ReadonlySet<string>,
    ): void => {
      for (const node of childrenOf(parentId)) {
        if (ancestors.has(node.id)) continue;
        result.push({ node, level });
        if (expandedIds.includes(node.id))
          visit(node.id, level + 1, new Set([...ancestors, node.id]));
      }
    };
    visit(null, 1, new Set());
    return result;
  };
  const build = (
    expandedIds: readonly string[],
    selectedIds: readonly string[],
    expansionControlled: boolean,
    selectionControlled: boolean,
  ): TreeSnapshot => {
    const visible = flatten(expandedIds);
    return {
      activeId,
      expandedIds: Object.freeze([...expandedIds]),
      selectedIds: Object.freeze([...selectedIds]),
      expansionControlled,
      selectionControlled,
      visibleNodes: visible.map(({ node, level }) => {
        const siblings = childrenOf(node.parentId ?? null);
        return {
          id: node.id,
          parentId: node.parentId ?? null,
          level,
          setSize: siblings.length,
          positionInSet: siblings.findIndex((sibling) => sibling.id === node.id) + 1,
          expanded: expandedIds.includes(node.id),
          selected: selectedIds.includes(node.id),
          disabled: node.disabled ?? false,
          loading: node.loading ?? false,
          tabIndex: activeId === node.id ? 0 : -1,
          role: 'treeitem',
        };
      }),
      role: 'tree',
      ariaMultiselectable: options.multiple ?? false,
    };
  };
  const initialExpanded = options.defaultExpandedIds ?? [];
  const initialSelected = options.defaultSelectedIds ?? [];
  const host = createControllerHost<TreeSnapshot, TreeEvents>(
    build(
      initialExpanded,
      initialSelected,
      options.getExpandedIds !== undefined,
      options.getSelectedIds !== undefined,
    ),
  );
  const sync = (): void => {
    host.update(build(expanded.get(), selected.get(), expanded.controlled, selected.controlled));
  };
  const expanded = createControllableValue<readonly string[], TreeChangeReason>(
    {
      defaultValue: initialExpanded,
      ...(options.getExpandedIds ? { getValue: options.getExpandedIds } : {}),
      ...(options.onExpandedIdsChange ? { onValueChange: options.onExpandedIdsChange } : {}),
      ...(options.subscribeExpandedIds ? { subscribeValue: options.subscribeExpandedIds } : {}),
    },
    sync,
  );
  const selected = createControllableValue<readonly string[], TreeChangeReason>(
    {
      defaultValue: initialSelected,
      ...(options.getSelectedIds ? { getValue: options.getSelectedIds } : {}),
      ...(options.onSelectedIdsChange ? { onValueChange: options.onSelectedIdsChange } : {}),
      ...(options.subscribeSelectedIds ? { subscribeValue: options.subscribeSelectedIds } : {}),
    },
    sync,
  );
  const setActive = (id: string | null): void => {
    if (!host.alive()) return;
    if (id && entries.get(id)?.node.disabled) return;
    activeId = id;
    sync();
  };
  const toggle = (
    id: string,
    changeDetails: ChangeDetails<TreeChangeReason> = { reason: 'programmatic' },
  ): void => {
    const node = entries.get(id)?.node;
    if (!node || node.disabled || (!node.hasChildren && childrenOf(id).length === 0)) return;
    const current = [...expanded.get()];
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    const payload = { node, details: changeDetails };
    if (!host.emit('beforeExpand', payload)) return;
    expanded.set(next, changeDetails);
    sync();
    host.emit('expand', payload);
    host.emit('stateChange', payload);
  };
  const selectNode = (
    id: string,
    changeDetails: ChangeDetails<TreeChangeReason> = { reason: 'programmatic' },
  ): void => {
    const node = entries.get(id)?.node;
    if (!node || node.disabled) return;
    const current = [...selected.get()];
    const next = options.multiple
      ? current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
      : [id];
    const payload = { node, details: changeDetails };
    if (!host.emit('beforeSelect', payload)) return;
    activeId = id;
    selected.set(next, changeDetails);
    sync();
    host.emit('select', payload);
    host.emit('stateChange', payload);
  };
  const visibleEnabled = (): readonly TreeNode[] =>
    flatten(expanded.get())
      .map(({ node }) => node)
      .filter((node) => !node.disabled);
  const resetTypeahead = (): void => {
    typeahead = '';
  };
  host.resources.add(resetTypeahead);
  host.resources.add(typeaheadTimer.clear);
  host.resources.add(() => expanded.destroy());
  host.resources.add(() => selected.destroy());
  host.resources.add(() => entries.clear());
  return {
    getSnapshot: host.getSnapshot,
    subscribe: host.subscribe,
    on: host.on,
    off: host.off,
    once: host.once,
    registerNode(node) {
      if (!host.alive()) return () => undefined;
      sequence += 1;
      const token = Symbol(node.id);
      entries.set(node.id, { node: Object.freeze({ ...node }), token, sequence });
      if (!activeId && !node.disabled) activeId = node.id;
      sync();
      return () => {
        if (entries.get(node.id)?.token !== token) return;
        const visibleBefore = visibleEnabled();
        const removedIndex = visibleBefore.findIndex((item) => item.id === node.id);
        entries.delete(node.id);
        if (activeId === node.id) {
          const visibleAfter = visibleEnabled();
          activeId =
            visibleAfter[Math.min(Math.max(removedIndex, 0), visibleAfter.length - 1)]?.id ?? null;
        }
        sync();
      };
    },
    toggle,
    select: selectNode,
    setActive,
    handleKeyDown(event) {
      if (!host.alive()) return;
      const visible = visibleEnabled();
      const index = visible.findIndex((node) => node.id === activeId);
      let next: string | undefined;
      if (event.key === 'ArrowDown') next = visible[Math.min(index + 1, visible.length - 1)]?.id;
      else if (event.key === 'ArrowUp') next = visible[Math.max(index - 1, 0)]?.id;
      else if (event.key === 'Home') next = visible[0]?.id;
      else if (event.key === 'End') next = visible.at(-1)?.id;
      else if (event.key === 'ArrowRight' && activeId) {
        const node = entries.get(activeId)?.node;
        if (
          node &&
          !expanded.get().includes(activeId) &&
          (node.hasChildren || childrenOf(activeId).length)
        )
          toggle(activeId, { reason: 'keyboard', event });
        else next = childrenOf(activeId).find((child) => !child.disabled)?.id;
      } else if (event.key === 'ArrowLeft' && activeId) {
        const node = entries.get(activeId)?.node;
        if (expanded.get().includes(activeId)) toggle(activeId, { reason: 'keyboard', event });
        else next = node?.parentId ?? undefined;
      } else if ((event.key === 'Enter' || event.key === ' ') && activeId) {
        selectNode(activeId, { reason: 'keyboard', event });
      } else if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
        typeahead += event.key;
        next = findTypeaheadMatch(
          visible as readonly CollectionItem[],
          typeahead,
          activeId ?? undefined,
        );
        typeaheadTimer.schedule(resetTypeahead, 500);
      } else return;
      event.preventDefault();
      if (next) setActive(next);
    },
    destroy: host.destroy,
  };
}
