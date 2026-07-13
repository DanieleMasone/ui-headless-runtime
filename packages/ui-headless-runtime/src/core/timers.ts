/** Owns one replaceable timeout and exposes deterministic idempotent cleanup. @internal */
export interface TimeoutManager {
  /** Replaces any pending callback and schedules the next callback after `delay` milliseconds. */
  schedule(callback: () => void, delay: number): void;
  /** Cancels the pending callback. Repeated calls are no-ops. */
  clear(): void;
  /** Whether a callback is currently pending. */
  readonly pending: boolean;
}

/**
 * Creates the timeout primitive shared by delayed overlays and typeahead buffers.
 *
 * @remarks A fired callback releases its timer before invoking consumer code, so re-entrant
 * scheduling is safe. The manager never reads DOM globals and can be disposed with `clear()`.
 * @internal
 */
export function createTimeoutManager(): TimeoutManager {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clear = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  return {
    get pending() {
      return timer !== undefined;
    },
    schedule(callback, delay) {
      clear();
      timer = setTimeout(
        () => {
          timer = undefined;
          callback();
        },
        Math.max(0, delay),
      );
    },
    clear,
  };
}
