import { createRuntimeId } from '../accessibility/ids';
import { createCollection, type CollectionItem } from '../collections/collection';
import { createControllerHost } from '../core/host';
import type {
  ChangeDetails,
  ControllableValueOptions,
  RuntimeController,
  RuntimeEventSource,
} from '../core/types';
import { focusById } from '../focus/focus';
import { createControllableValue } from '../state/controllable';

/** Tabs activation behavior. @public */
export type TabsActivation = 'automatic' | 'manual';

/** Tabs orientation used for keyboard direction. @public */
export type TabsOrientation = 'horizontal' | 'vertical';

/** Causes of tab selection. @public */
export type TabsChangeReason = 'programmatic' | 'pointer' | 'keyboard' | 'focus';

/** Dynamic tab and panel registration. @public */
export interface TabItem extends CollectionItem {
  /** Optional deterministic tab element ID. */
  readonly tabId?: string;
  /** Optional deterministic panel element ID. */
  readonly panelId?: string;
}

/** Immutable tab/panel relationship metadata. @public */
export interface TabItemSnapshot {
  /** Stable item ID. */
  readonly id: string;
  /** Consumer-rendered tab ID. */
  readonly tabId: string;
  /** Consumer-rendered panel ID. */
  readonly panelId: string;
  /** Value for `aria-selected`. */
  readonly selected: boolean;
  /** Value for `tabindex`. */
  readonly tabIndex: 0 | -1;
  /** Whether the tab is disabled. */
  readonly disabled: boolean;
}

/** Immutable Tabs snapshot. @public */
export interface TabsSnapshot {
  /** Selected tab item ID. */
  readonly selectedId: string | null;
  /** Roving-focus tab item ID. */
  readonly focusedId: string | null;
  /** Consumer-owned state indicator. */
  readonly controlled: boolean;
  /** Configured orientation. */
  readonly orientation: TabsOrientation;
  /** Configured activation behavior. */
  readonly activation: TabsActivation;
  /** Ordered tab/panel metadata. */
  readonly items: readonly TabItemSnapshot[];
}

/** Tab selection lifecycle payload. @public */
export interface TabsChangeEvent {
  /** Next selected item ID. */
  readonly selectedId: string;
  /** Typed cause and optional native event. */
  readonly details: ChangeDetails<TabsChangeReason>;
}

/** Tabs event map. @public */
export interface TabsEvents {
  /** Cancellable event emitted before selection. */
  readonly beforeSelect: TabsChangeEvent;
  /** Event emitted after selection. */
  readonly select: TabsChangeEvent;
  /** Event emitted with the published selection snapshot. */
  readonly stateChange: TabsChangeEvent;
}

/** Tabs configuration with controlled/uncontrolled selection. @public */
export interface TabsOptions extends Partial<
  ControllableValueOptions<string | null, TabsChangeReason>
> {
  /** Manual or automatic selection on focus. @defaultValue `automatic` */
  readonly activation?: TabsActivation;
  /** Horizontal or vertical arrow-key model. @defaultValue `horizontal` */
  readonly orientation?: TabsOrientation;
  /** Right-to-left horizontal keyboard direction. @defaultValue `false` */
  readonly rtl?: boolean;
  /** Wraps at collection edges. @defaultValue `true` */
  readonly loop?: boolean;
  /** Stable relationship ID prefix. */
  readonly id?: string;
}

/** Headless Tabs controller. @public */
export interface TabsController
  extends RuntimeController<TabsSnapshot>, RuntimeEventSource<TabsEvents> {
  /** Registers a dynamic tab and optional focusable tab element. */
  registerTab(item: TabItem, element?: HTMLElement): () => void;
  /** Selects an enabled tab and synchronizes roving focus. */
  select(id: string, details?: ChangeDetails<TabsChangeReason>): void;
  /** Focuses an enabled tab, selecting it in automatic mode. */
  focus(id: string, details?: ChangeDetails<TabsChangeReason>): void;
  /** Handles orientation-aware Arrow keys, Home, End, Enter, and Space. */
  handleKeyDown(id: string, event: KeyboardEvent): void;
}

/** Creates WAI-ARIA Tabs with dynamic registration and no renderer assumptions. @public */
export function createTabs(options: TabsOptions = {}): TabsController {
  const collection = createCollection<TabItem>();
  const elements = new Map<string, HTMLElement>();
  const registrations = new Map<string, symbol>();
  const orientation = options.orientation ?? 'horizontal';
  const activation = options.activation ?? 'automatic';
  const prefix = options.id ?? createRuntimeId('tabs');
  let focusedId: string | null = null;
  const build = (selectedId: string | null, controlled: boolean): TabsSnapshot => ({
    selectedId,
    focusedId,
    controlled,
    orientation,
    activation,
    items: collection.items().map((item) => ({
      id: item.id,
      tabId: item.tabId ?? `${prefix}-${item.id}-tab`,
      panelId: item.panelId ?? `${prefix}-${item.id}-panel`,
      selected: selectedId === item.id,
      tabIndex: focusedId === item.id ? 0 : -1,
      disabled: item.disabled ?? false,
    })),
  });
  const host = createControllerHost<TabsSnapshot, TabsEvents>(
    build(options.getValue?.() ?? options.defaultValue ?? null, options.getValue !== undefined),
  );
  const sync = (): void => {
    host.update(build(state.get(), state.controlled));
  };
  let pendingChange: TabsChangeEvent | undefined;
  const commit = (
    selectedId: string | null,
    changeDetails?: ChangeDetails<TabsChangeReason>,
  ): void => {
    if (selectedId && collection.get(selectedId) && !collection.get(selectedId)?.disabled)
      focusedId = selectedId;
    sync();
    if (!selectedId || !changeDetails || !pendingChange) return;
    const payload = { selectedId, details: changeDetails };
    pendingChange = undefined;
    host.emit('select', payload);
    host.emit('stateChange', payload);
  };
  const state = createControllableValue<string | null, TabsChangeReason>(
    {
      defaultValue: options.defaultValue ?? null,
      ...(options.getValue ? { getValue: options.getValue } : {}),
      ...(options.onValueChange ? { onValueChange: options.onValueChange } : {}),
      ...(options.subscribeValue ? { subscribeValue: options.subscribeValue } : {}),
    },
    commit,
  );
  const select = (
    id: string,
    changeDetails: ChangeDetails<TabsChangeReason> = { reason: 'programmatic' },
  ): void => {
    const item = collection.get(id);
    if (!item || item.disabled || state.get() === id) return;
    const payload = { selectedId: id, details: changeDetails };
    if (!host.emit('beforeSelect', payload)) return;
    pendingChange = payload;
    if (state.set(id, changeDetails)) commit(id, changeDetails);
  };
  const focus = (
    id: string,
    changeDetails: ChangeDetails<TabsChangeReason> = { reason: 'focus' },
  ): void => {
    const item = collection.get(id);
    if (!item || item.disabled) return;
    focusedId = id;
    sync();
    focusById(elements, id);
    if (activation === 'automatic') select(id, changeDetails);
  };
  host.resources.add(() => state.destroy());
  host.resources.add(() => collection.clear());
  host.resources.add(() => elements.clear());
  host.resources.add(() => registrations.clear());
  return {
    getSnapshot: host.getSnapshot,
    subscribe: host.subscribe,
    on: host.on,
    off: host.off,
    once: host.once,
    registerTab(item, element) {
      if (!host.alive()) return () => undefined;
      const token = Symbol(item.id);
      registrations.set(item.id, token);
      const unregister = collection.register(item);
      if (element) elements.set(item.id, element);
      else elements.delete(item.id);
      if (!focusedId && !item.disabled) focusedId = item.id;
      else if (focusedId === item.id && item.disabled) focusedId = collection.edge('first') ?? null;
      if (!state.get() && !item.disabled) state.set(item.id, { reason: 'programmatic' });
      else if (state.get() === item.id && item.disabled)
        state.set(collection.edge('first') ?? null, { reason: 'programmatic' });
      sync();
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        unregister();
        if (registrations.get(item.id) === token) {
          registrations.delete(item.id);
          elements.delete(item.id);
        }
        const current = collection.get(item.id);
        if (focusedId === item.id && (!current || current.disabled))
          focusedId = collection.edge('first') ?? null;
        if (state.get() === item.id && (!current || current.disabled)) {
          const next = collection.edge('first') ?? null;
          state.set(next, { reason: 'programmatic' });
        }
        sync();
      };
    },
    select,
    focus,
    handleKeyDown(id, event) {
      if (!host.alive()) return;
      let target: string | undefined;
      const forward =
        orientation === 'horizontal' ? (options.rtl ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown';
      const backward =
        orientation === 'horizontal' ? (options.rtl ? 'ArrowRight' : 'ArrowLeft') : 'ArrowUp';
      if (event.key === forward) target = collection.move(id, 1, options.loop ?? true);
      else if (event.key === backward) target = collection.move(id, -1, options.loop ?? true);
      else if (event.key === 'Home') target = collection.edge('first');
      else if (event.key === 'End') target = collection.edge('last');
      else if (activation === 'manual' && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        select(id, { reason: 'keyboard', event });
        return;
      } else return;
      event.preventDefault();
      if (target) focus(target, { reason: 'keyboard', event });
    },
    destroy: host.destroy,
  };
}
