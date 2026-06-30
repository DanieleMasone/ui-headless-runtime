import { createRuntimeId } from '../accessibility/ids';
import type {
  ChangeDetails,
  ControllableValueOptions,
  EventSource,
  RuntimeController,
} from '../core/types';
import { createDisposableScope } from '../core/disposables';
import { createTimeoutManager } from '../core/timers';
import { listen } from '../dom/dom';
import type { PositionOptions } from '../positioning/positioning';
import {
  createOpenController,
  type OpenChangeReason,
  type OpenLifecycleEvents,
  type OpenSnapshot,
} from './openable';

/** Immutable Tooltip state and relationship metadata. @public */
export interface TooltipSnapshot extends OpenSnapshot {
  /** Stable trigger ID. */
  readonly triggerId: string;
  /** Value for trigger `aria-describedby` while open. */
  readonly ariaDescribedby: string | null;
  /** Tooltip role for non-interactive consumer content. */
  readonly role: 'tooltip';
}

/** Tooltip delay, scope, state, and positioning options. @public */
export interface TooltipOptions extends Partial<
  ControllableValueOptions<boolean, OpenChangeReason>
> {
  /** Deterministic relationship ID base. */
  readonly id?: string;
  /** Delay before pointer-triggered opening in milliseconds. @defaultValue `700` */
  readonly openDelay?: number;
  /** Delay before pointer-triggered closing in milliseconds. @defaultValue `100` */
  readonly closeDelay?: number;
  /** Scope in which only one tooltip may be active. @defaultValue `default` */
  readonly scope?: string;
  /** Shared anchored positioning options. */
  readonly positioning?: PositionOptions;
}

/** Headless non-interactive Tooltip controller. @public */
export interface TooltipController
  extends RuntimeController<TooltipSnapshot>, EventSource<OpenLifecycleEvents> {
  /** Binds trigger/content listeners and positioning; touch pointer entry is intentionally ignored. */
  bind(trigger: HTMLElement, content: HTMLElement): () => void;
  /** Opens after the configured pointer delay, or immediately for keyboard focus. */
  scheduleOpen(reason?: 'hover' | 'focus', event?: Event): void;
  /** Closes after the configured pointer delay, or immediately for focus exit. */
  scheduleClose(reason?: 'hover' | 'focus-out', event?: Event): void;
  /** Immediately closes and cancels pending timers. */
  close(details?: ChangeDetails<OpenChangeReason>): void;
}

const activeScopes = new Map<string, () => void>();

/** Creates a Tooltip with cleanup-safe delays and one-active-tooltip-per-scope coordination. @public */
export function createTooltip(options: TooltipOptions = {}): TooltipController {
  const id = options.id ?? createRuntimeId('tooltip');
  const scope = options.scope ?? 'default';
  const overlay = createOpenController<OpenChangeReason>({
    id: `${id}-content`,
    role: 'tooltip',
    closeOnFocusOutside: false,
    closeOnOutsidePointer: false,
    restoreFocus: false,
    ...(options.defaultValue !== undefined ? { defaultValue: options.defaultValue } : {}),
    ...(options.getValue ? { getValue: options.getValue } : {}),
    ...(options.onValueChange ? { onValueChange: options.onValueChange } : {}),
    ...(options.subscribeValue ? { subscribeValue: options.subscribeValue } : {}),
    ...(options.positioning ? { positioning: options.positioning } : {}),
  });
  const timer = createTimeoutManager();
  let binding = createDisposableScope();
  let destroyed = false;
  const listeners = new Set<(snapshot: Readonly<TooltipSnapshot>) => void>();
  const map = (snapshot: OpenSnapshot): TooltipSnapshot => ({
    ...snapshot,
    triggerId: `${id}-trigger`,
    ariaDescribedby: snapshot.open ? `${id}-content` : null,
    role: 'tooltip',
  });
  let current = map(overlay.getSnapshot());
  const clearTimer = timer.clear;
  const close = (
    changeDetails: ChangeDetails<OpenChangeReason> = { reason: 'programmatic' },
  ): void => {
    clearTimer();
    overlay.close(changeDetails);
    if (activeScopes.get(scope) === close) activeScopes.delete(scope);
  };
  const unsubscribe = overlay.subscribe((snapshot) => {
    current = map(snapshot);
    for (const listener of [...listeners]) listener(current);
  });
  const scheduleOpen = (reason: 'hover' | 'focus' = 'hover', event?: Event): void => {
    if (destroyed) return;
    clearTimer();
    const run = () => {
      activeScopes.get(scope)?.();
      activeScopes.set(scope, close);
      overlay.open(event ? { reason, event } : { reason });
    };
    const delay = reason === 'focus' ? 0 : (options.openDelay ?? 700);
    if (delay === 0) run();
    else timer.schedule(run, delay);
  };
  const scheduleClose = (reason: 'hover' | 'focus-out' = 'hover', event?: Event): void => {
    if (destroyed) return;
    clearTimer();
    const run = () => close(event ? { reason, event } : { reason });
    const delay = reason === 'focus-out' ? 0 : (options.closeDelay ?? 100);
    if (delay === 0) run();
    else timer.schedule(run, delay);
  };
  return {
    getSnapshot: () => current,
    subscribe(listener) {
      if (destroyed) return () => undefined;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    on: overlay.on,
    off: overlay.off,
    once: overlay.once,
    bind(trigger, content) {
      if (destroyed) return () => undefined;
      binding.dispose();
      const scope = createDisposableScope();
      binding = scope;
      scope.add(overlay.bind({ trigger, anchor: trigger, content }));
      scope.add(
        listen<PointerEvent>(trigger, 'pointerenter', (event) => {
          if (event.pointerType !== 'touch') scheduleOpen('hover', event);
        }),
      );
      scope.add(
        listen<PointerEvent>(trigger, 'pointerleave', (event) => scheduleClose('hover', event)),
      );
      scope.add(listen<FocusEvent>(trigger, 'focusin', (event) => scheduleOpen('focus', event)));
      scope.add(
        listen<FocusEvent>(trigger, 'focusout', (event) => scheduleClose('focus-out', event)),
      );
      return () => scope.dispose();
    },
    scheduleOpen,
    scheduleClose,
    close,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearTimer();
      binding.dispose();
      unsubscribe();
      listeners.clear();
      if (activeScopes.get(scope) === close) activeScopes.delete(scope);
      overlay.destroy();
    },
  };
}
