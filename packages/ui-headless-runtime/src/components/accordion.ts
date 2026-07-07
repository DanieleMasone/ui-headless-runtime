import { createCollection, type CollectionItem } from '../collections/collection';
import { createControllerHost } from '../core/host';
import type {
  ChangeDetails,
  ControllableValueOptions,
  EventSource,
  RuntimeController,
} from '../core/types';
import { focusById } from '../focus/focus';
import { createControllableValue } from '../state/controllable';
import { createDisclosureSnapshot } from './disclosure';

/** Accordion expansion modes. @public */
export type AccordionType = 'single' | 'multiple';

/** Causes of accordion expansion and focus changes. @public */
export type AccordionChangeReason = 'programmatic' | 'trigger' | 'keyboard';

/** Dynamic accordion item registration. @public */
export interface AccordionItem extends CollectionItem {
  /** Optional consumer-provided trigger ID. */
  readonly triggerId?: string;
  /** Optional consumer-provided panel ID. */
  readonly panelId?: string;
}

/** Immutable per-item ARIA and state metadata. @public */
export interface AccordionItemSnapshot {
  /** Stable item ID. */
  readonly id: string;
  /** Trigger DOM ID. */
  readonly triggerId: string;
  /** Panel DOM ID. */
  readonly panelId: string;
  /** Current expansion state. */
  readonly expanded: boolean;
  /** Current disabled state. */
  readonly disabled: boolean;
  /** Roving tabindex value for the trigger. */
  readonly tabIndex: 0 | -1;
}

/** Immutable Accordion snapshot. @public */
export interface AccordionSnapshot {
  /** Single or multiple expansion mode. */
  readonly type: AccordionType;
  /** Ordered expanded item IDs. */
  readonly expandedIds: readonly string[];
  /** Keyboard-focused trigger ID. */
  readonly focusedId: string | null;
  /** Whether expansion state is consumer-owned. */
  readonly controlled: boolean;
  /** Ordered registered item metadata. */
  readonly items: readonly AccordionItemSnapshot[];
}

/** Accordion expansion event payload. @public */
export interface AccordionChangeEvent {
  /** Ordered next expanded IDs. */
  readonly expandedIds: readonly string[];
  /** Item that initiated the transition. */
  readonly itemId: string;
  /** Typed cause and optional native event. */
  readonly details: ChangeDetails<AccordionChangeReason>;
}

/** Accordion event map with cancellable expansion. @public */
export interface AccordionEvents {
  /** Cancellable event emitted before expansion state changes. */
  readonly beforeChange: AccordionChangeEvent;
  /** Event emitted after expansion state changes. */
  readonly stateChange: AccordionChangeEvent;
}

/** Accordion options using the shared controllable state contract. @public */
export interface AccordionOptions extends Partial<
  ControllableValueOptions<readonly string[], AccordionChangeReason>
> {
  /** Single or multiple expansion mode. @defaultValue `single` */
  readonly type?: AccordionType;
  /** Allows the single open item to collapse. @defaultValue `false` */
  readonly collapsible?: boolean;
  /** Wraps trigger focus at collection edges. @defaultValue `true` */
  readonly loop?: boolean;
  /** Stable ID prefix for item relationships. */
  readonly id?: string;
}

/** Headless Accordion controller. @public */
export interface AccordionController
  extends RuntimeController<AccordionSnapshot>, EventSource<AccordionEvents> {
  /** Registers an item and optional trigger element for roving focus. */
  registerItem(item: AccordionItem, trigger?: HTMLElement): () => void;
  /** Toggles an item according to single/multiple and collapsible rules. */
  toggle(itemId: string, details?: ChangeDetails<AccordionChangeReason>): void;
  /** Handles Arrow, Home, End, Enter, and Space on an item trigger. */
  handleTriggerKeyDown(itemId: string, event: KeyboardEvent): void;
  /** Focuses a registered enabled trigger by ID. */
  focus(itemId: string): void;
}

/** Creates an Accordion that reuses the shared collection and controllable-state layers. @public */
export function createAccordion(options: AccordionOptions = {}): AccordionController {
  const type = options.type ?? 'single';
  const prefix = options.id ?? 'accordion';
  const collection = createCollection<AccordionItem>();
  const triggers = new Map<string, HTMLElement>();
  let focusedId: string | null = null;
  const build = (expandedIds: readonly string[], controlled: boolean): AccordionSnapshot => ({
    type,
    expandedIds: Object.freeze([...expandedIds]),
    focusedId,
    controlled,
    items: collection.items().map((item) => {
      const relationship = createDisclosureSnapshot(
        `${prefix}-${item.id}`,
        expandedIds.includes(item.id),
        controlled,
        item.disabled ?? false,
        item.triggerId,
        item.panelId,
      );
      return {
        id: item.id,
        triggerId: relationship.trigger.id,
        panelId: relationship.panel.id,
        expanded: relationship.expanded,
        disabled: relationship.disabled,
        tabIndex: focusedId === item.id ? 0 : -1,
      };
    }),
  });
  const host = createControllerHost<AccordionSnapshot, AccordionEvents>(
    build(options.defaultValue ?? [], options.getValue !== undefined),
  );
  const sync = (): void => {
    host.update(build(state.get(), state.controlled));
  };
  let pendingChange: AccordionChangeEvent | undefined;
  const commit = (
    expandedIds: readonly string[],
    changeDetails?: ChangeDetails<AccordionChangeReason>,
  ): void => {
    sync();
    if (!changeDetails || !pendingChange) return;
    const payload = { ...pendingChange, expandedIds, details: changeDetails };
    pendingChange = undefined;
    host.emit('stateChange', payload);
  };
  const state = createControllableValue<readonly string[], AccordionChangeReason>(
    {
      defaultValue: options.defaultValue ?? [],
      ...(options.getValue ? { getValue: options.getValue } : {}),
      ...(options.onValueChange ? { onValueChange: options.onValueChange } : {}),
      ...(options.subscribeValue ? { subscribeValue: options.subscribeValue } : {}),
    },
    commit,
  );
  const focus = (id: string): void => {
    const item = collection.get(id);
    if (!item || item.disabled) return;
    focusedId = id;
    sync();
    focusById(triggers, id);
  };
  const toggle = (
    itemId: string,
    changeDetails: ChangeDetails<AccordionChangeReason> = { reason: 'programmatic' },
  ): void => {
    const item = collection.get(itemId);
    if (!item || item.disabled) return;
    const current = [...state.get()];
    const expanded = current.includes(itemId);
    let next: readonly string[];
    if (expanded) {
      if (type === 'single' && !options.collapsible) return;
      next = current.filter((id) => id !== itemId);
    } else next = type === 'single' ? [itemId] : [...current, itemId];
    const payload = { expandedIds: next, itemId, details: changeDetails };
    if (!host.emit('beforeChange', payload)) return;
    pendingChange = payload;
    if (state.set(next, changeDetails)) commit(next, changeDetails);
  };
  host.resources.add(() => state.destroy());
  host.resources.add(() => collection.clear());
  return {
    getSnapshot: host.getSnapshot,
    subscribe: host.subscribe,
    on: host.on,
    off: host.off,
    once: host.once,
    registerItem(item, trigger) {
      if (!host.alive()) return () => undefined;
      const unregister = collection.register(item);
      if (trigger) triggers.set(item.id, trigger);
      if (!focusedId && !item.disabled) focusedId = item.id;
      sync();
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        unregister();
        if (triggers.get(item.id) === trigger) triggers.delete(item.id);
        if (focusedId === item.id) focusedId = collection.edge('first') ?? null;
        sync();
      };
    },
    toggle,
    handleTriggerKeyDown(itemId, event) {
      let target: string | undefined;
      if (event.key === 'ArrowDown') target = collection.move(itemId, 1, options.loop ?? true);
      else if (event.key === 'ArrowUp') target = collection.move(itemId, -1, options.loop ?? true);
      else if (event.key === 'Home') target = collection.edge('first');
      else if (event.key === 'End') target = collection.edge('last');
      else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle(itemId, { reason: 'keyboard', event });
        return;
      } else return;
      event.preventDefault();
      if (target) focus(target);
    },
    focus,
    destroy: host.destroy,
  };
}
