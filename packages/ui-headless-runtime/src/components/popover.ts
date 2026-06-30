import type {
  ChangeDetails,
  ControllableValueOptions,
  EventSource,
  RuntimeController,
} from '../core/types';
import type { PositionOptions } from '../positioning/positioning';
import {
  createOpenController,
  type OpenChangeReason,
  type OpenLifecycleEvents,
  type OpenSnapshot,
  type OverlayElements,
} from './openable';

/** Popover options for state, dismissal, focus, and collision-aware positioning. @public */
export interface PopoverOptions extends Partial<
  ControllableValueOptions<boolean, OpenChangeReason>
> {
  /** Deterministic popover ID. */
  readonly id?: string;
  /** Closes on outside focus when true. @defaultValue `true` */
  readonly closeOnFocusOutside?: boolean;
  /** Moves initial focus into the popover when true. @defaultValue `false` */
  readonly focusContent?: boolean;
  /** Restores trigger focus after keyboard dismissal. @defaultValue `true` */
  readonly restoreFocus?: boolean;
  /** Shared placement and collision configuration. */
  readonly positioning?: PositionOptions;
}

/** Headless Popover command, event, binding, and positioning surface. @public */
export interface PopoverController
  extends RuntimeController<OpenSnapshot>, EventSource<OpenLifecycleEvents> {
  /** Opens with a typed cause. */
  open(details?: ChangeDetails<OpenChangeReason>): void;
  /** Closes with a typed cause. */
  close(details?: ChangeDetails<OpenChangeReason>): void;
  /** Requests the opposite state. */
  toggle(details?: ChangeDetails<OpenChangeReason>): void;
  /** Binds trigger, content, optional branches, and optional virtual anchor. */
  bind(elements: OverlayElements): () => void;
  /** Recalculates coordinates after consumer-rendered size changes. */
  updatePosition(): void;
}

/** Creates a collision-aware Popover that treats descendant overlay branches as inside. @public */
export function createPopover(options: PopoverOptions = {}): PopoverController {
  const base = createOpenController<OpenChangeReason>({
    role: 'dialog',
    modal: false,
    trapFocus: false,
    focusOnOpen: options.focusContent ?? false,
    restoreFocusOnOutside: false,
    closeOnFocusOutside: options.closeOnFocusOutside ?? true,
    ...(options.id ? { id: options.id } : {}),
    ...(options.defaultValue !== undefined ? { defaultValue: options.defaultValue } : {}),
    ...(options.getValue ? { getValue: options.getValue } : {}),
    ...(options.onValueChange ? { onValueChange: options.onValueChange } : {}),
    ...(options.subscribeValue ? { subscribeValue: options.subscribeValue } : {}),
    ...(options.restoreFocus !== undefined ? { restoreFocus: options.restoreFocus } : {}),
    ...(options.positioning ? { positioning: options.positioning } : {}),
  });
  return {
    ...base,
    open: (changeDetails = { reason: 'programmatic' }) => base.open(changeDetails),
    close: (changeDetails = { reason: 'programmatic' }) => base.close(changeDetails),
    toggle: (changeDetails = { reason: 'programmatic' }) => base.toggle(changeDetails),
  };
}
