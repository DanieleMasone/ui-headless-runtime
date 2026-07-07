import type { Unsubscribe } from './types';

/** Owns cleanup functions and releases them once in reverse registration order. @public */
export interface DisposableScope {
  /** Adds a cleanup function, or executes it immediately when the scope is already disposed. */
  add(dispose: Unsubscribe): Unsubscribe;
  /** Removes and executes every owned resource. Repeated calls are no-ops. */
  dispose(): void;
  /** Reports whether the scope has released its resources. */
  readonly disposed: boolean;
}

/** Creates an idempotent cleanup scope for listeners, timers, and observers. @public */
export function createDisposableScope(): DisposableScope {
  const disposers = new Set<Unsubscribe>();
  let disposed = false;
  return {
    get disposed() {
      return disposed;
    },
    add(dispose) {
      if (disposed) {
        dispose();
        return () => undefined;
      }
      let active = true;
      const owned = () => {
        if (!active) return;
        active = false;
        disposers.delete(owned);
        dispose();
      };
      disposers.add(owned);
      return owned;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const errors: unknown[] = [];
      for (const dispose of [...disposers].reverse()) {
        try {
          dispose();
        } catch (error) {
          errors.push(error);
        }
      }
      disposers.clear();
      if (errors.length === 1) throw errors[0];
      if (errors.length > 1) throw new AggregateError(errors, 'Multiple resource cleanups failed.');
    },
  };
}
