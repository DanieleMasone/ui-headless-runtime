import { createRuntimeId } from '../accessibility/ids';
import { createControllerHost } from '../core/host';
import type {
  ChangeDetails,
  ControllableValueOptions,
  RuntimeController,
  RuntimeEventSource,
} from '../core/types';
import { createControllableValue } from '../state/controllable';

/** Typed causes accepted by Disclosure and Collapsible. @public */
export type DisclosureChangeReason = 'programmatic' | 'trigger' | 'keyboard';

/** Immutable semantic metadata for a disclosure trigger. @public */
export interface DisclosureTriggerProps {
  /** Stable trigger ID. */
  readonly id: string;
  /** ID of the controlled panel. */
  readonly ariaControls: string;
  /** Current expansion state. */
  readonly ariaExpanded: boolean;
  /** Whether user interaction is disabled. */
  readonly disabled: boolean;
}

/** Immutable semantic metadata for a disclosure panel. @public */
export interface DisclosurePanelProps {
  /** Stable panel ID. */
  readonly id: string;
  /** Trigger that labels the panel. */
  readonly ariaLabelledby: string;
  /** Whether the consumer should hide the panel. */
  readonly hidden: boolean;
  /** Region role used by the WAI-ARIA disclosure pattern. */
  readonly role: 'region';
}

/** Immutable Disclosure snapshot. @public */
export interface DisclosureSnapshot {
  /** Current expansion state. */
  readonly expanded: boolean;
  /** Whether state ownership belongs to the consumer. */
  readonly controlled: boolean;
  /** Current interaction-disabled state. */
  readonly disabled: boolean;
  /** Trigger semantics for consumer rendering. */
  readonly trigger: DisclosureTriggerProps;
  /** Panel semantics for consumer rendering. */
  readonly panel: DisclosurePanelProps;
}

/** Disclosure transition payload. @public */
export interface DisclosureChangeEvent {
  /** Requested next expansion state. */
  readonly expanded: boolean;
  /** Typed cause and optional native event. */
  readonly details: ChangeDetails<DisclosureChangeReason>;
}

/** Disclosure lifecycle event map. @public */
export interface DisclosureEvents {
  /** Cancellable event emitted before expansion. */
  readonly beforeOpen: DisclosureChangeEvent;
  /** Event emitted after expansion. */
  readonly open: DisclosureChangeEvent;
  /** Event emitted after expansion resources settle. */
  readonly afterOpen: DisclosureChangeEvent;
  /** Cancellable event emitted before collapse. */
  readonly beforeClose: DisclosureChangeEvent;
  /** Event emitted after collapse. */
  readonly close: DisclosureChangeEvent;
  /** Event emitted after collapse resources settle. */
  readonly afterClose: DisclosureChangeEvent;
  /** Event emitted for each accepted transition. */
  readonly stateChange: DisclosureChangeEvent;
}

/** Disclosure configuration supporting consumer-owned or internal state. @public */
export interface DisclosureOptions extends Partial<
  ControllableValueOptions<boolean, DisclosureChangeReason>
> {
  /** Deterministic ID base used for trigger/panel relationships. */
  readonly id?: string;
  /** Prevents interaction while preserving semantic state. */
  readonly disabled?: boolean;
}

/** Headless Disclosure command and event surface. @public */
export interface DisclosureController
  extends RuntimeController<DisclosureSnapshot>, RuntimeEventSource<DisclosureEvents> {
  /** Expands unless disabled, already expanded, destroyed, or cancelled. */
  expand(details?: ChangeDetails<DisclosureChangeReason>): void;
  /** Collapses unless disabled, already collapsed, destroyed, or cancelled. */
  collapse(details?: ChangeDetails<DisclosureChangeReason>): void;
  /** Requests the opposite state with a typed cause. */
  toggle(details?: ChangeDetails<DisclosureChangeReason>): void;
  /** Updates interaction-disabled state without replacing the controller. */
  setDisabled(disabled: boolean): void;
  /** Handles click activation from consumer-rendered trigger markup. */
  handleTriggerClick(event: MouseEvent): void;
  /** Handles Enter and Space activation from non-native trigger integrations. */
  handleTriggerKeyDown(event: KeyboardEvent): void;
}

/** Builds the shared disclosure state and relationship metadata used by grouped disclosures. */
export function createDisclosureSnapshot(
  id: string,
  expanded: boolean,
  controlled: boolean,
  disabled: boolean,
  triggerId = `${id}-trigger`,
  panelId = `${id}-panel`,
): DisclosureSnapshot {
  return {
    expanded,
    controlled,
    disabled,
    trigger: {
      id: triggerId,
      ariaControls: panelId,
      ariaExpanded: expanded,
      disabled,
    },
    panel: {
      id: panelId,
      ariaLabelledby: triggerId,
      hidden: !expanded,
      role: 'region',
    },
  };
}

/** Creates an accessible Disclosure controller with no rendering or CSS side effects. @public */
export function createDisclosure(options: DisclosureOptions = {}): DisclosureController {
  const id = options.id ?? createRuntimeId('disclosure');
  let disabled = options.disabled ?? false;
  const controlled = options.getValue !== undefined;
  const initialExpanded = options.getValue?.() ?? options.defaultValue ?? false;
  const snapshot = (expanded: boolean, controlled: boolean): DisclosureSnapshot =>
    createDisclosureSnapshot(id, expanded, controlled, disabled);
  const host = createControllerHost<DisclosureSnapshot, DisclosureEvents>(
    snapshot(initialExpanded, controlled),
  );
  const sync = (): void => {
    host.update(snapshot(state.get(), state.controlled));
  };
  const commit = (
    expanded: boolean,
    changeDetails?: ChangeDetails<DisclosureChangeReason>,
  ): void => {
    sync();
    if (!changeDetails) return;
    const payload = { expanded, details: changeDetails };
    host.emit(expanded ? 'open' : 'close', payload);
    host.emit('stateChange', payload);
    host.emit(expanded ? 'afterOpen' : 'afterClose', payload);
  };
  const state = createControllableValue<boolean, DisclosureChangeReason>(
    {
      defaultValue: options.defaultValue ?? false,
      ...(options.getValue ? { getValue: options.getValue } : {}),
      ...(options.onValueChange ? { onValueChange: options.onValueChange } : {}),
      ...(options.subscribeValue ? { subscribeValue: options.subscribeValue } : {}),
    },
    commit,
  );
  const change = (
    expanded: boolean,
    changeDetails: ChangeDetails<DisclosureChangeReason>,
  ): void => {
    if (!host.alive() || disabled || state.get() === expanded) return;
    const payload = { expanded, details: changeDetails };
    if (!host.emit(expanded ? 'beforeOpen' : 'beforeClose', payload)) return;
    if (state.set(expanded, changeDetails)) commit(expanded, changeDetails);
  };
  const fallback: ChangeDetails<DisclosureChangeReason> = { reason: 'programmatic' };
  host.resources.add(() => state.destroy());
  return {
    getSnapshot: host.getSnapshot,
    subscribe: host.subscribe,
    on: host.on,
    off: host.off,
    once: host.once,
    expand: (changeDetails = fallback) => change(true, changeDetails),
    collapse: (changeDetails = fallback) => change(false, changeDetails),
    toggle: (changeDetails = fallback) => change(!state.get(), changeDetails),
    setDisabled(value) {
      if (!host.alive() || disabled === value) return;
      disabled = value;
      sync();
    },
    handleTriggerClick(event) {
      change(!state.get(), { reason: 'trigger', event });
    },
    handleTriggerKeyDown(event) {
      if (!host.alive()) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      change(!state.get(), { reason: 'keyboard', event });
    },
    destroy: host.destroy,
  };
}

/** Collapsible is the Disclosure primitive under intent-revealing naming. @public */
export type CollapsibleController = DisclosureController;

/** Creates a Collapsible by reusing the complete Disclosure state and accessibility contract. @public */
export function createCollapsible(options: DisclosureOptions = {}): CollapsibleController {
  return createDisclosure(options);
}
