import { fuzzyScore } from '../collections/collection';
import { createControllerHost } from '../core/host';
import type { ChangeDetails, EventSource, RuntimeController } from '../core/types';
import { isAbortError, isHTMLInputElement } from '../dom/dom';
import type { PositionOptions, PositionResult } from '../positioning/positioning';
import { createControllableValue } from '../state/controllable';
import {
  createListbox,
  type ListboxChangeReason,
  type ListboxOption,
  type ListboxSelectEvent,
} from './listbox';
import {
  createOpenController,
  type OpenChangeEvent,
  type OpenLifecycleEvents,
  type OverlayElements,
} from './openable';

/** Causes of editable Combobox input changes. @public */
export type ComboboxInputReason = 'programmatic' | 'input' | 'selection' | 'clear';

/** Combobox option with a required consumer value. @public */
export interface ComboboxOption extends ListboxOption {
  /** Consumer value committed on selection. */
  readonly value: string;
}

/** Immutable Combobox snapshot. @public */
export interface ComboboxSnapshot {
  /** Current popup state. */
  readonly open: boolean;
  /** Current editable input value. */
  readonly inputValue: string;
  /** Query used for local or async filtering. */
  readonly query: string;
  /** Selected consumer value, if any. */
  readonly selectedValue: string | null;
  /** Keyboard-active option ID. */
  readonly activeId: string | null;
  /** Whether an async suggestion request is active. */
  readonly loading: boolean;
  /** Whether an IME composition transaction is active. */
  readonly composing: boolean;
  /** Whether no visible option matches a settled query. */
  readonly empty: boolean;
  /** Whether input value is consumer-owned. */
  readonly inputControlled: boolean;
  /** Whether selected value is consumer-owned. */
  readonly selectionControlled: boolean;
  /** Filtered option metadata used by the popup listbox. */
  readonly options: readonly ComboboxOption[];
  /** Stable listbox ID for `aria-controls`. */
  readonly listboxId: string;
  /** Latest collision-aware popup position. */
  readonly position: PositionResult | null;
}

/** Combobox query change payload. @public */
export interface ComboboxQueryEvent {
  /** Next query. */
  readonly query: string;
  /** Typed cause and optional native event. */
  readonly details: ChangeDetails<ComboboxInputReason>;
}

/** Combobox selection payload. @public */
export interface ComboboxSelectEvent {
  /** Selected option. */
  readonly option: Readonly<ComboboxOption>;
  /** Typed selection cause and optional native event. */
  readonly details: ChangeDetails<ListboxChangeReason>;
}

/** Combobox lifecycle event map. @public */
export interface ComboboxEvents extends Omit<OpenLifecycleEvents, 'stateChange'> {
  /** Cancellable event emitted before option selection. */
  readonly beforeSelect: ComboboxSelectEvent;
  /** Event emitted after option selection. */
  readonly select: ComboboxSelectEvent;
  /** Event emitted whenever the search query changes. */
  readonly queryChange: ComboboxQueryEvent;
  /** Event emitted for open, query, async, and selection mutations. */
  readonly stateChange: OpenChangeEvent | ComboboxQueryEvent | ComboboxSelectEvent;
}

/** Combobox options for two controlled values, filtering, async suggestions, and positioning. @public */
export interface ComboboxOptions {
  /** Initial editable input value in uncontrolled mode. */
  readonly defaultInputValue?: string;
  /** Reads consumer-owned input value. */
  readonly getInputValue?: () => string;
  /** Receives accepted input requests. */
  readonly onInputValueChange?: (
    value: string,
    details: ChangeDetails<ComboboxInputReason>,
  ) => void;
  /** Subscribes to external input changes. */
  readonly subscribeInputValue?: (listener: () => void) => () => void;
  /** Initial selected value in uncontrolled mode. */
  readonly defaultSelectedValue?: string | null;
  /** Reads consumer-owned selected value. */
  readonly getSelectedValue?: () => string | null;
  /** Receives accepted selection requests. */
  readonly onSelectedValueChange?: (
    value: string | null,
    details: ChangeDetails<ListboxChangeReason>,
  ) => void;
  /** Subscribes to external selection changes. */
  readonly subscribeSelectedValue?: (listener: () => void) => () => void;
  /** Replaces the default fuzzy local matcher. */
  readonly filter?: (option: Readonly<ComboboxOption>, query: string) => boolean;
  /** Loads query-specific options; stale responses are ignored by request generation. */
  readonly loadOptions?: (query: string, signal: AbortSignal) => Promise<readonly ComboboxOption[]>;
  /** Popup positioning options shared with other anchored components. */
  readonly positioning?: PositionOptions;
  /** Deterministic ID prefix. */
  readonly id?: string;
}

/** Headless editable Combobox controller. @public */
export interface ComboboxController
  extends RuntimeController<ComboboxSnapshot>, EventSource<ComboboxEvents> {
  /** Registers a local option and returns cleanup scoped to that option. */
  registerOption(option: ComboboxOption): () => void;
  /** Binds input/popup DOM through the shared overlay layer. */
  bind(elements: OverlayElements): () => void;
  /** Updates editable text, filtering and async suggestions. */
  setInputValue(value: string, details?: ChangeDetails<ComboboxInputReason>): void;
  /** Handles a native input event without reading during module evaluation. */
  handleInput(event: InputEvent): void;
  /** Handles popup navigation, selection, and Escape. */
  handleKeyDown(event: KeyboardEvent): void;
  /** Marks the start of an IME composition transaction. */
  handleCompositionStart(): void;
  /** Commits the final IME value and resumes filtering. */
  handleCompositionEnd(event: CompositionEvent): void;
  /** Selects a visible enabled option. */
  select(id: string, details?: ChangeDetails<ListboxChangeReason>): void;
  /** Re-runs async suggestions for the current query. */
  refresh(): Promise<void>;
}

/** Creates an editable Combobox with stale-response protection and shared Listbox behavior. @public */
export function createCombobox(options: ComboboxOptions = {}): ComboboxController {
  const listbox = createListbox(options.id ? { id: `${options.id}-listbox` } : {});
  const overlay = createOpenController({
    role: 'listbox',
    closeOnFocusOutside: true,
    ...(options.positioning ? { positioning: options.positioning } : {}),
  });
  const localOptions = new Map<string, ComboboxOption>();
  let asyncOptions: readonly ComboboxOption[] = [];
  let visibleOptions: readonly ComboboxOption[] = [];
  let visibleCleanups: (() => void)[] = [];
  let query = options.defaultInputValue ?? '';
  let loading = false;
  let composing = false;
  let requestId = 0;
  let abortController: AbortController | undefined;
  const initialListbox = listbox.getSnapshot();
  const initialOverlay = overlay.getSnapshot();
  const host = createControllerHost<ComboboxSnapshot, ComboboxEvents>({
    open: initialOverlay.open,
    inputValue: options.defaultInputValue ?? '',
    query,
    selectedValue: options.defaultSelectedValue ?? null,
    activeId: initialListbox.activeId,
    loading,
    composing,
    empty: true,
    inputControlled: options.getInputValue !== undefined,
    selectionControlled: options.getSelectedValue !== undefined,
    options: [],
    listboxId: initialListbox.id,
    position: initialOverlay.position,
  });
  const sync = (): void => {
    const listboxSnapshot = listbox.getSnapshot();
    const overlaySnapshot = overlay.getSnapshot();
    host.update({
      open: overlaySnapshot.open,
      inputValue: inputState.get(),
      query,
      selectedValue: selectedState.get(),
      activeId: listboxSnapshot.activeId,
      loading,
      composing,
      empty: !loading && visibleOptions.length === 0,
      inputControlled: inputState.controlled,
      selectionControlled: selectedState.controlled,
      options: visibleOptions,
      listboxId: listboxSnapshot.id,
      position: overlaySnapshot.position,
    });
  };
  let pendingSelection: ComboboxSelectEvent | undefined;
  const commitInput = (value: string, changeDetails?: ChangeDetails<ComboboxInputReason>): void => {
    query = value;
    rebuildVisible();
    if (!changeDetails) {
      void refresh();
      return;
    }
    const payload = { query, details: changeDetails };
    host.emit('queryChange', payload);
    host.emit('stateChange', payload);
    overlay.open({
      reason: changeDetails.reason === 'input' ? 'trigger' : 'programmatic',
      ...(changeDetails.event ? { event: changeDetails.event } : {}),
    });
    void refresh();
  };
  const commitSelection = (
    _value: string | null,
    changeDetails?: ChangeDetails<ListboxChangeReason>,
  ): void => {
    sync();
    if (!changeDetails || !pendingSelection) return;
    const payload = { ...pendingSelection, details: changeDetails };
    pendingSelection = undefined;
    const inputDetails: ChangeDetails<ComboboxInputReason> = {
      reason: 'selection',
      ...(changeDetails.event ? { event: changeDetails.event } : {}),
    };
    if (inputState.set(payload.option.text, inputDetails))
      commitInput(payload.option.text, inputDetails);
    host.emit('select', payload);
    host.emit('stateChange', payload);
    overlay.close({
      reason: 'selection',
      ...(changeDetails.event ? { event: changeDetails.event } : {}),
    });
  };
  const inputState = createControllableValue<string, ComboboxInputReason>(
    {
      defaultValue: options.defaultInputValue ?? '',
      ...(options.getInputValue ? { getValue: options.getInputValue } : {}),
      ...(options.onInputValueChange ? { onValueChange: options.onInputValueChange } : {}),
      ...(options.subscribeInputValue ? { subscribeValue: options.subscribeInputValue } : {}),
    },
    commitInput,
  );
  const selectedState = createControllableValue<string | null, ListboxChangeReason>(
    {
      defaultValue: options.defaultSelectedValue ?? null,
      ...(options.getSelectedValue ? { getValue: options.getSelectedValue } : {}),
      ...(options.onSelectedValueChange ? { onValueChange: options.onSelectedValueChange } : {}),
      ...(options.subscribeSelectedValue ? { subscribeValue: options.subscribeSelectedValue } : {}),
    },
    commitSelection,
  );
  const rebuildVisible = (): void => {
    visibleCleanups.splice(0).forEach((cleanup) => cleanup());
    const all = [...localOptions.values(), ...asyncOptions];
    const filter =
      options.filter ??
      ((option: Readonly<ComboboxOption>, value: string) =>
        fuzzyScore(option.text, value) > Number.NEGATIVE_INFINITY);
    visibleOptions = Object.freeze(all.filter((option) => filter(option, query)));
    visibleCleanups = visibleOptions.map((option) => listbox.registerOption(option));
    sync();
  };
  const refresh = async (): Promise<void> => {
    if (!host.alive() || !options.loadOptions || composing) return;
    requestId += 1;
    const currentRequest = requestId;
    abortController?.abort();
    abortController = new AbortController();
    loading = true;
    sync();
    try {
      const result = await options.loadOptions(query, abortController.signal);
      if (currentRequest !== requestId || abortController.signal.aborted || !host.alive()) return;
      asyncOptions = Object.freeze([...result]);
      rebuildVisible();
    } catch (error) {
      if (!isAbortError(error)) throw error;
    } finally {
      if (currentRequest === requestId) {
        loading = false;
        sync();
      }
    }
  };
  const setInputValue = (
    value: string,
    changeDetails: ChangeDetails<ComboboxInputReason> = { reason: 'programmatic' },
  ): void => {
    if (!host.alive() || inputState.get() === value) return;
    if (inputState.set(value, changeDetails)) commitInput(value, changeDetails);
  };
  const selectOption = (
    id: string,
    changeDetails: ChangeDetails<ListboxChangeReason> = { reason: 'programmatic' },
  ): void => listbox.select(id, changeDetails);
  host.resources.add(listbox.subscribe(sync));
  host.resources.add(overlay.subscribe(sync));
  const openEvents = [
    'beforeOpen',
    'open',
    'afterOpen',
    'beforeClose',
    'close',
    'afterClose',
  ] as const;
  for (const name of openEvents) {
    host.resources.add(
      overlay.on(name, (event) => {
        if (!host.emit(name, event.detail)) event.preventDefault();
      }),
    );
  }
  host.resources.add(overlay.on('stateChange', (event) => host.emit('stateChange', event.detail)));
  host.resources.add(
    listbox.on('beforeSelect', (event) => {
      const option =
        localOptions.get(event.detail.option.id) ??
        asyncOptions.find((item) => item.id === event.detail.option.id);
      if (!option || !host.emit('beforeSelect', { option, details: event.detail.details }))
        event.preventDefault();
    }),
  );
  host.resources.add(
    listbox.on('select', (event) => {
      const selection = event.detail as ListboxSelectEvent;
      const option =
        localOptions.get(selection.option.id) ??
        asyncOptions.find((item) => item.id === selection.option.id);
      if (!option) return;
      const payload = { option, details: selection.details };
      pendingSelection = payload;
      if (selectedState.set(option.value, selection.details))
        commitSelection(option.value, selection.details);
    }),
  );
  host.resources.add(() => inputState.destroy());
  host.resources.add(() => selectedState.destroy());
  host.resources.add(() => listbox.destroy());
  host.resources.add(() => overlay.destroy());
  host.resources.add(() => abortController?.abort());
  host.resources.add(() => visibleCleanups.splice(0).forEach((cleanup) => cleanup()));
  rebuildVisible();
  return {
    getSnapshot: host.getSnapshot,
    subscribe: host.subscribe,
    on: host.on,
    off: host.off,
    once: host.once,
    registerOption(option) {
      if (!host.alive()) return () => undefined;
      localOptions.set(option.id, Object.freeze({ ...option }));
      rebuildVisible();
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        if (localOptions.get(option.id)?.value === option.value) localOptions.delete(option.id);
        rebuildVisible();
      };
    },
    bind: overlay.bind,
    setInputValue,
    handleInput(event) {
      if (composing) return;
      const target = event.target;
      if (isHTMLInputElement(target)) setInputValue(target.value, { reason: 'input', event });
    },
    handleKeyDown(event) {
      if (!host.alive()) return;
      if (event.key === 'Escape') {
        overlay.close({ reason: 'escape-key', event });
        return;
      }
      if (event.key === 'ArrowDown' && !overlay.getSnapshot().open)
        overlay.open({ reason: 'keyboard', event });
      listbox.handleKeyDown(event);
    },
    handleCompositionStart() {
      if (!host.alive()) return;
      composing = true;
      sync();
    },
    handleCompositionEnd(event) {
      if (!host.alive()) return;
      composing = false;
      const target = event.target;
      sync();
      if (isHTMLInputElement(target)) setInputValue(target.value, { reason: 'input', event });
    },
    select: selectOption,
    refresh,
    destroy: host.destroy,
  };
}
