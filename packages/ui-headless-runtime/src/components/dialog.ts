import type {
  ChangeDetails,
  ControllableValueOptions,
  EventSource,
  RuntimeController,
} from '../core/types';
import {
  createOpenController,
  type OpenChangeReason,
  type OpenLifecycleEvents,
  type OpenSnapshot,
  type OverlayElements,
} from './openable';

/** Immutable Dialog snapshot including modal and backdrop semantics. @public */
export interface DialogSnapshot extends OpenSnapshot {
  /** Whether the dialog is modal. */
  readonly modal: boolean;
  /** Value for consumer-rendered `aria-modal`. */
  readonly ariaModal: boolean;
  /** Metadata indicating whether a backdrop belongs to this dialog. */
  readonly hasBackdrop: boolean;
}

/** Dialog options for state ownership, focus, dismissal, and semantics. @public */
export interface DialogOptions extends Partial<
  ControllableValueOptions<boolean, OpenChangeReason>
> {
  /** Deterministic content ID. */
  readonly id?: string;
  /** Enables focus containment, sibling inerting, and scroll lock. @defaultValue `true` */
  readonly modal?: boolean;
  /** Disables outside-pointer dismissal when false. @defaultValue `true` */
  readonly closeOnOutsidePointer?: boolean;
  /** Disables topmost Escape dismissal when false. @defaultValue `true` */
  readonly closeOnEscape?: boolean;
  /** Resolves the preferred initial focus target after content binding. */
  readonly initialFocus?: () => HTMLElement | null;
  /** Restores focus to a connected trigger or pre-open target. @defaultValue `true` */
  readonly restoreFocus?: boolean;
}

/** Headless Dialog controller. @public */
export interface DialogController
  extends RuntimeController<DialogSnapshot>, EventSource<OpenLifecycleEvents> {
  /** Opens programmatically unless the cancellable lifecycle vetoes it. */
  open(details?: ChangeDetails<OpenChangeReason>): void;
  /** Closes programmatically unless the cancellable lifecycle vetoes it. */
  close(details?: ChangeDetails<OpenChangeReason>): void;
  /** Requests the opposite open state. */
  toggle(details?: ChangeDetails<OpenChangeReason>): void;
  /** Binds consumer-rendered DOM and activates focus/dismissal resources only while open. */
  bind(elements: OverlayElements): () => void;
}

/** Creates a modal-by-default Dialog with topmost Escape handling and shared focus management. @public */
export function createDialog(options: DialogOptions = {}): DialogController {
  const modal = options.modal ?? true;
  const base = createOpenController<OpenChangeReason>({
    role: 'dialog',
    modal,
    trapFocus: modal,
    focusOnOpen: modal || options.initialFocus !== undefined,
    restoreFocusOnOutside: true,
    closeOnFocusOutside: false,
    ...(options.id ? { id: options.id } : {}),
    ...(options.defaultValue !== undefined ? { defaultValue: options.defaultValue } : {}),
    ...(options.getValue ? { getValue: options.getValue } : {}),
    ...(options.onValueChange ? { onValueChange: options.onValueChange } : {}),
    ...(options.subscribeValue ? { subscribeValue: options.subscribeValue } : {}),
    ...(options.closeOnOutsidePointer !== undefined
      ? { closeOnOutsidePointer: options.closeOnOutsidePointer }
      : {}),
    ...(options.closeOnEscape !== undefined ? { closeOnEscape: options.closeOnEscape } : {}),
    ...(options.initialFocus ? { initialFocus: options.initialFocus } : {}),
    ...(options.restoreFocus !== undefined ? { restoreFocus: options.restoreFocus } : {}),
  });
  const map = (snapshot: OpenSnapshot): DialogSnapshot => ({
    ...snapshot,
    modal,
    ariaModal: modal,
    hasBackdrop: modal,
  });
  let current = map(base.getSnapshot());
  let destroyed = false;
  const listeners = new Set<(snapshot: Readonly<DialogSnapshot>) => void>();
  const unsubscribe = base.subscribe((snapshot) => {
    current = map(snapshot);
    for (const listener of [...listeners]) listener(current);
  });
  return {
    getSnapshot: () => current,
    subscribe(listener) {
      if (destroyed) return () => undefined;
      listeners.add(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        listeners.delete(listener);
      };
    },
    on: base.on,
    off: base.off,
    once: base.once,
    open: (changeDetails = { reason: 'programmatic' }) => base.open(changeDetails),
    close: (changeDetails = { reason: 'programmatic' }) => base.close(changeDetails),
    toggle: (changeDetails = { reason: 'programmatic' }) => base.toggle(changeDetails),
    bind: base.bind,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      listeners.clear();
      base.destroy();
    },
  };
}
