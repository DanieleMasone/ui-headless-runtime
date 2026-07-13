import type { RuntimeEvent, RuntimeEventListener, Unsubscribe } from '../core/types';

/** Typed event emitter with deterministic delivery and cancellable events. @internal */
export interface TypedEventEmitter<TEvents extends object> {
  /** Registers a listener and returns an idempotent unsubscribe function. */
  on<TKey extends keyof TEvents>(
    type: TKey,
    listener: RuntimeEventListener<TEvents[TKey]>,
  ): Unsubscribe;
  /** Removes a listener registered for the specified event. */
  off<TKey extends keyof TEvents>(type: TKey, listener: RuntimeEventListener<TEvents[TKey]>): void;
  /** Registers a listener for one delivery. */
  once<TKey extends keyof TEvents>(
    type: TKey,
    listener: RuntimeEventListener<TEvents[TKey]>,
  ): Unsubscribe;
  /** Delivers a typed payload and returns false when a listener cancelled it. */
  emit<TKey extends keyof TEvents>(type: TKey, detail: TEvents[TKey]): boolean;
  /** Removes every listener. */
  clear(): void;
}

/**
 * Creates an emitter whose listener snapshot is stable during each emission.
 *
 * @remarks Listener additions/removals during emission affect the next emission only.
 * @internal
 */
export function createEventEmitter<TEvents extends object>(): TypedEventEmitter<TEvents> {
  const listeners = new Map<keyof TEvents, Set<RuntimeEventListener<unknown>>>();
  const on = <TKey extends keyof TEvents>(
    type: TKey,
    listener: RuntimeEventListener<TEvents[TKey]>,
  ): Unsubscribe => {
    const bucket = listeners.get(type) ?? new Set<RuntimeEventListener<unknown>>();
    listeners.set(type, bucket);
    const genericListener = listener as RuntimeEventListener<unknown>;
    bucket.add(genericListener);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      bucket.delete(genericListener);
      if (bucket.size === 0) listeners.delete(type);
    };
  };
  return {
    on,
    off(type, listener) {
      const bucket = listeners.get(type);
      bucket?.delete(listener as RuntimeEventListener<unknown>);
      if (bucket?.size === 0) listeners.delete(type);
    },
    once(type, listener) {
      const unsubscribe: Unsubscribe = on(type, (event) => {
        unsubscribe();
        listener(event);
      });
      return unsubscribe;
    },
    emit(type, detail) {
      let prevented = false;
      const event: RuntimeEvent<TEvents[typeof type]> = {
        detail,
        get defaultPrevented() {
          return prevented;
        },
        preventDefault() {
          prevented = true;
        },
      };
      const snapshot = [...(listeners.get(type) ?? [])];
      for (const listener of snapshot) listener(event);
      return !prevented;
    },
    clear() {
      listeners.clear();
    },
  };
}
