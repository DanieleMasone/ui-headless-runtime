import type { ChangeDetails, ControllableValueOptions, Unsubscribe } from '../core/types';

/** Shared controlled/uncontrolled state cell with atomic, re-entrant-safe updates. @internal */
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
 * @internal
 */
export function createControllableValue<TValue, TReason extends string>(
  options: ControllableValueOptions<TValue, TReason>,
  onExternalChange: (value: TValue, details?: ChangeDetails<TReason>) => void,
): ControllableValue<TValue, TReason> {
  let internal = options.defaultValue;
  let destroyed = false;
  let notifying = false;
  let requesting = false;
  let queued: { value: TValue; details: ChangeDetails<TReason> } | undefined;
  let pendingRequest: { value: TValue; details: ChangeDetails<TReason> } | undefined;
  const externalReader = options.getValue;
  const controlled = externalReader !== undefined;
  const get = (): TValue => (externalReader ? externalReader() : internal);
  let lastObserved = get();
  const notifyExternal = (): void => {
    if (destroyed) return;
    const value = get();
    if (pendingRequest && !Object.is(pendingRequest.value, value)) pendingRequest = undefined;
    if (Object.is(lastObserved, value)) return;
    lastObserved = value;
    const details =
      pendingRequest && Object.is(pendingRequest.value, value) ? pendingRequest.details : undefined;
    if (details) pendingRequest = undefined;
    if (!requesting) onExternalChange(value, details);
  };
  let externalUnsubscribe: Unsubscribe = () => undefined;
  externalUnsubscribe = options.subscribeValue?.(notifyExternal) ?? externalUnsubscribe;
  const commit = (value: TValue, details: ChangeDetails<TReason>): boolean => {
    if (destroyed || Object.is(get(), value)) return false;
    if (notifying) {
      queued = { value, details };
      return true;
    }
    notifying = true;
    try {
      let next: { value: TValue; details: ChangeDetails<TReason> } | undefined = {
        value,
        details,
      };
      let changed = false;
      while (next) {
        queued = undefined;
        const before = get();
        if (!Object.is(before, next.value)) {
          if (controlled) pendingRequest = next;
          else internal = next.value;
          requesting = true;
          try {
            options.onValueChange?.(next.value, next.details);
          } finally {
            requesting = false;
          }
          const observed = get();
          if (!Object.is(before, observed)) {
            lastObserved = observed;
            if (controlled) pendingRequest = undefined;
            changed = true;
          }
        }
        next = queued;
      }
      return changed;
    } catch (error) {
      queued = undefined;
      pendingRequest = undefined;
      throw error;
    } finally {
      notifying = false;
      requesting = false;
    }
  };
  return {
    get,
    set: commit,
    controlled,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      queued = undefined;
      pendingRequest = undefined;
      externalUnsubscribe();
    },
  };
}
