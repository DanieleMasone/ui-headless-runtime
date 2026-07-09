import { createDisposableScope } from './disposables';
import { createEventEmitter } from '../events/emitter';
import type {
  EventListener,
  EventSource,
  RuntimeController,
  SnapshotListener,
  Unsubscribe,
} from './types';

export interface ControllerHost<TSnapshot extends object, TEvents extends object>
  extends RuntimeController<TSnapshot>, EventSource<TEvents> {
  readonly resources: ReturnType<typeof createDisposableScope>;
  readonly alive: () => boolean;
  update(next: TSnapshot): boolean;
  emit<TKey extends keyof TEvents>(type: TKey, detail: TEvents[TKey]): boolean;
}

const freezeSnapshot = <TSnapshot extends object>(snapshot: TSnapshot): Readonly<TSnapshot> => {
  if (!Object.isFrozen(snapshot)) Object.freeze(snapshot);
  return snapshot;
};

export function createControllerHost<TSnapshot extends object, TEvents extends object>(
  initial: TSnapshot,
): ControllerHost<TSnapshot, TEvents> {
  let current = freezeSnapshot(initial);
  let destroyed = false;
  let publishing = false;
  let pending: TSnapshot | undefined;
  const listeners = new Set<SnapshotListener<TSnapshot>>();
  const events = createEventEmitter<TEvents>();
  const resources = createDisposableScope();
  const update = (next: TSnapshot): boolean => {
    if (destroyed || Object.is(current, next)) return false;
    if (publishing) {
      pending = next;
      return true;
    }
    publishing = true;
    try {
      let candidate: TSnapshot | undefined = next;
      while (candidate) {
        pending = undefined;
        current = freezeSnapshot(candidate);
        for (const listener of [...listeners]) listener(current);
        candidate = pending;
      }
      return true;
    } catch (error) {
      pending = undefined;
      throw error;
    } finally {
      publishing = false;
    }
  };
  return {
    resources,
    alive: () => !destroyed,
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
    update,
    emit: events.emit,
    on<TKey extends keyof TEvents>(
      type: TKey,
      listener: EventListener<TEvents[TKey]>,
    ): Unsubscribe {
      return destroyed ? () => undefined : events.on(type, listener);
    },
    off<TKey extends keyof TEvents>(type: TKey, listener: EventListener<TEvents[TKey]>): void {
      events.off(type, listener);
    },
    once<TKey extends keyof TEvents>(
      type: TKey,
      listener: EventListener<TEvents[TKey]>,
    ): Unsubscribe {
      return destroyed ? () => undefined : events.once(type, listener);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      pending = undefined;
      listeners.clear();
      events.clear();
      resources.dispose();
    },
  };
}
