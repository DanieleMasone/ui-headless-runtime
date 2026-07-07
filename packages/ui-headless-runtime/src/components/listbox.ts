import {
  createCollection,
  findTypeaheadMatch,
  type CollectionItem,
} from '../collections/collection';
import { createRuntimeId } from '../accessibility/ids';
import { createControllerHost } from '../core/host';
import { createTimeoutManager } from '../core/timers';
import type {
  ChangeDetails,
  ControllableValueOptions,
  EventSource,
  RuntimeController,
} from '../core/types';
import { createControllableValue } from '../state/controllable';

/** Listbox selection mode. @public */
export type ListboxSelectionMode = 'single' | 'multiple';

/** Causes of listbox selection changes. @public */
export type ListboxChangeReason = 'programmatic' | 'pointer' | 'keyboard' | 'typeahead';

/** Dynamic Listbox option registration. @public */
export interface ListboxOption extends CollectionItem {
  /** Consumer value; defaults to the stable option ID. */
  readonly value?: string;
}

/** Immutable per-option semantic metadata. @public */
export interface ListboxOptionSnapshot {
  /** Stable option ID. */
  readonly id: string;
  /** Consumer selection value. */
  readonly value: string;
  /** Human-readable typeahead text. */
  readonly text: string;
  /** Value for `aria-selected`. */
  readonly selected: boolean;
  /** Value for `aria-disabled`. */
  readonly disabled: boolean;
  /** Option role for consumer markup. */
  readonly role: 'option';
}

/** Immutable Listbox snapshot. @public */
export interface ListboxSnapshot {
  /** Stable listbox ID used by `aria-controls`. */
  readonly id: string;
  /** Listbox role for consumer markup. */
  readonly role: 'listbox';
  /** Whether multiple values may be selected. */
  readonly ariaMultiselectable: boolean;
  /** ID exposed through `aria-activedescendant`. */
  readonly activeId: string | null;
  /** Ordered selected consumer values. */
  readonly selectedValues: readonly string[];
  /** Whether selection is consumer-owned. */
  readonly controlled: boolean;
  /** Ordered option semantics. */
  readonly options: readonly ListboxOptionSnapshot[];
}

/** Listbox selection lifecycle payload. @public */
export interface ListboxSelectEvent {
  /** Option that initiated the transition. */
  readonly option: Readonly<ListboxOption>;
  /** Ordered next selected values. */
  readonly selectedValues: readonly string[];
  /** Typed cause and optional native event. */
  readonly details: ChangeDetails<ListboxChangeReason>;
}

/** Listbox event map. @public */
export interface ListboxEvents {
  /** Cancellable event emitted before selection changes. */
  readonly beforeSelect: ListboxSelectEvent;
  /** Event emitted after selection changes. */
  readonly select: ListboxSelectEvent;
  /** Event emitted with the published selection snapshot. */
  readonly stateChange: ListboxSelectEvent;
}

/** Listbox options for state ownership and keyboard behavior. @public */
export interface ListboxOptions extends Partial<
  ControllableValueOptions<readonly string[], ListboxChangeReason>
> {
  /** Single or multiple selection. @defaultValue `single` */
  readonly selectionMode?: ListboxSelectionMode;
  /** Wraps Arrow navigation at collection edges. @defaultValue `true` */
  readonly loop?: boolean;
  /** Deterministic listbox ID. */
  readonly id?: string;
}

/** Headless Listbox controller using active-descendant focus. @public */
export interface ListboxController
  extends RuntimeController<ListboxSnapshot>, EventSource<ListboxEvents> {
  /** Registers a dynamic option and returns cleanup scoped to that registration. */
  registerOption(option: ListboxOption): () => void;
  /** Sets the keyboard-active enabled option. */
  setActive(id: string | null): void;
  /** Selects or toggles an enabled option. */
  select(id: string, details?: ChangeDetails<ListboxChangeReason>): void;
  /** Handles Arrow keys, Home/End, typeahead, Enter, and Space. */
  handleKeyDown(event: KeyboardEvent): void;
}

/** Creates an accessible single- or multi-select Listbox with dynamic options. @public */
export function createListbox(options: ListboxOptions = {}): ListboxController {
  const id = options.id ?? createRuntimeId('listbox');
  const mode = options.selectionMode ?? 'single';
  const collection = createCollection<ListboxOption>();
  let activeId: string | null = null;
  let typeahead = '';
  const typeaheadTimer = createTimeoutManager();
  const build = (values: readonly string[], controlled: boolean): ListboxSnapshot => ({
    id,
    role: 'listbox',
    ariaMultiselectable: mode === 'multiple',
    activeId,
    selectedValues: Object.freeze([...values]),
    controlled,
    options: collection.items().map((option) => ({
      id: option.id,
      value: option.value ?? option.id,
      text: option.text,
      selected: values.includes(option.value ?? option.id),
      disabled: option.disabled ?? false,
      role: 'option',
    })),
  });
  const host = createControllerHost<ListboxSnapshot, ListboxEvents>(
    build(options.defaultValue ?? [], options.getValue !== undefined),
  );
  const sync = (): void => {
    host.update(build(state.get(), state.controlled));
  };
  let pendingSelection: ListboxSelectEvent | undefined;
  const commit = (
    selectedValues: readonly string[],
    changeDetails?: ChangeDetails<ListboxChangeReason>,
  ): void => {
    sync();
    if (!changeDetails || !pendingSelection) return;
    activeId = pendingSelection.option.id;
    const payload = { ...pendingSelection, selectedValues, details: changeDetails };
    pendingSelection = undefined;
    sync();
    host.emit('select', payload);
    host.emit('stateChange', payload);
  };
  const state = createControllableValue<readonly string[], ListboxChangeReason>(
    {
      defaultValue: options.defaultValue ?? [],
      ...(options.getValue ? { getValue: options.getValue } : {}),
      ...(options.onValueChange ? { onValueChange: options.onValueChange } : {}),
      ...(options.subscribeValue ? { subscribeValue: options.subscribeValue } : {}),
    },
    commit,
  );
  const setActive = (nextId: string | null): void => {
    if (!host.alive()) return;
    if (nextId && collection.get(nextId)?.disabled) return;
    if (activeId === nextId) return;
    activeId = nextId;
    sync();
  };
  const select = (
    optionId: string,
    changeDetails: ChangeDetails<ListboxChangeReason> = { reason: 'programmatic' },
  ): void => {
    const option = collection.get(optionId);
    if (!option || option.disabled) return;
    const value = option.value ?? option.id;
    const current = [...state.get()];
    const next =
      mode === 'single'
        ? [value]
        : current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value];
    if (current.length === next.length && current.every((item, index) => item === next[index]))
      return;
    const payload = { option, selectedValues: next, details: changeDetails };
    if (!host.emit('beforeSelect', payload)) return;
    pendingSelection = payload;
    if (state.set(next, changeDetails)) commit(next, changeDetails);
  };
  const resetTypeahead = (): void => {
    typeahead = '';
  };
  host.resources.add(resetTypeahead);
  host.resources.add(typeaheadTimer.clear);
  host.resources.add(() => state.destroy());
  host.resources.add(() => collection.clear());
  return {
    getSnapshot: host.getSnapshot,
    subscribe: host.subscribe,
    on: host.on,
    off: host.off,
    once: host.once,
    registerOption(option) {
      if (!host.alive()) return () => undefined;
      const unregister = collection.register(option);
      if (!activeId && !option.disabled) activeId = option.id;
      sync();
      return () => {
        unregister();
        if (activeId === option.id) activeId = collection.edge('first') ?? null;
        sync();
      };
    },
    setActive,
    select,
    handleKeyDown(event) {
      if (!host.alive()) return;
      let next: string | undefined;
      if (event.key === 'ArrowDown')
        next = collection.move(activeId ?? undefined, 1, options.loop ?? true);
      else if (event.key === 'ArrowUp')
        next = collection.move(activeId ?? undefined, -1, options.loop ?? true);
      else if (event.key === 'Home') next = collection.edge('first');
      else if (event.key === 'End') next = collection.edge('last');
      else if (event.key === 'Enter' || event.key === ' ') {
        if (activeId) select(activeId, { reason: 'keyboard', event });
      } else if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
        typeahead += event.key;
        next = findTypeaheadMatch(collection.items(), typeahead, activeId ?? undefined);
        typeaheadTimer.schedule(resetTypeahead, 500);
      } else return;
      event.preventDefault();
      if (next) setActive(next);
    },
    destroy: host.destroy,
  };
}
