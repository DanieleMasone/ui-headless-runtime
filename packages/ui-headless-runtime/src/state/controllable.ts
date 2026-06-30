import type { ChangeDetails, ControllableValueOptions, Unsubscribe } from '../core/types';

/** Shared controlled/uncontrolled state cell with atomic, re-entrant-safe updates. @public */
export interface ControllableValue<TValue, TReason extends string> {
  /** Reads the consumer-owned value in controlled mode or the internal value otherwise. */
  get(): TValue;
  /** Requests a value change and returns whether the observable value changed. */
  set(value: TValue, details: ChangeDetails<TReason>): boolean;
  /** Releases an optional external subscription. */
  destroy(): void;
  /** Reports whether the value is owned by the consumer. */
  readonly controlled: boolean;
}

/**
 * Creates the single state ownership primitive used by every component controller.
 *
 * @param options - Value reader, default, callback, and optional external subscription.
 * @param onExternalChange - Invalidates the owning controller when external state changes.
 * @returns An idempotently disposable value cell.
 * @public
 */
export function createControllableValue<TValue, TReason extends string>(
  options: ControllableValueOptions<TValue, TReason>,
  onExternalChange: () => void,
): ControllableValue<TValue, TReason> {
  let internal = options.defaultValue;
  let destroyed = false;
  let notifying = false;
  let queued: { value: TValue; details: ChangeDetails<TReason> } | undefined;
  const controlled = options.getValue !== undefined;
  const externalUnsubscribe: Unsubscribe =
    options.subscribeValue?.(onExternalChange) ?? (() => undefined);
  const get = (): TValue => options.getValue?.() ?? internal;
  const commit = (value: TValue, details: ChangeDetails<TReason>): boolean => {
    if (destroyed || Object.is(get(), value)) return false;
    if (notifying) {
      queued = { value, details };
      return true;
    }
    notifying = true;
    let next: { value: TValue; details: ChangeDetails<TReason> } | undefined = { value, details };
    let changed = false;
    while (next) {
      queued = undefined;
      if (!Object.is(get(), next.value)) {
        if (!controlled) internal = next.value;
        options.onValueChange?.(next.value, next.details);
        changed = true;
      }
      next = queued;
    }
    notifying = false;
    return changed;
  };
  return {
    get,
    set: commit,
    controlled,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      queued = undefined;
      externalUnsubscribe();
    },
  };
}
