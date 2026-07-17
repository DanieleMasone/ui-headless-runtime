import { describe, expect, it, vi } from 'vitest';
import { createCollection } from '../../packages/ui-headless-runtime/src/collections/collection';
import { createControllerHost } from '../../packages/ui-headless-runtime/src/core/host';
import { createSnapshotProjection } from '../../packages/ui-headless-runtime/src/core/projection';
import type {
  RuntimeController,
  SnapshotListener,
} from '../../packages/ui-headless-runtime/src/core/types';
import {
  createControllableValue,
  type ControllableValue,
} from '../../packages/ui-headless-runtime/src/state/controllable';

describe('core lifecycle edge contracts', () => {
  it('can release a projection without owning its source and ignores later refreshes', () => {
    let sourceSnapshot = { value: 1 };
    const listeners = new Set<SnapshotListener<{ value: number }>>();
    const destroySource = vi.fn();
    const source: RuntimeController<{ value: number }> = {
      getSnapshot: () => sourceSnapshot,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      destroy: destroySource,
    };
    const projection = createSnapshotProjection(
      source,
      (snapshot) => ({ doubled: snapshot.value * 2 }),
      false,
    );

    sourceSnapshot = { value: 2 };
    for (const listener of listeners) listener(sourceSnapshot);
    expect(projection.getSnapshot()).toEqual({ doubled: 4 });

    projection.destroy();
    sourceSnapshot = { value: 3 };
    projection.refresh();
    expect(projection.getSnapshot()).toEqual({ doubled: 4 });
    expect(destroySource).not.toHaveBeenCalled();
  });

  it('preserves an already frozen host snapshot and keeps collection cleanup idempotent', () => {
    const initial = Object.freeze({ value: 1 });
    const host = createControllerHost<typeof initial, Record<never, never>>(initial);
    expect(host.getSnapshot()).toBe(initial);

    const collection = createCollection<{ id: string; text: string }>();
    const unregister = collection.register({ id: 'one', text: 'One' });
    unregister();
    unregister();
    expect(collection.items()).toEqual([]);

    host.destroy();
  });

  it('coalesces synchronous controlled notifications and already committed queued requests', () => {
    let external = 0;
    let notify = (): void => undefined;
    const observed = vi.fn();
    const synchronous = createControllableValue<number, 'set'>(
      {
        defaultValue: -1,
        getValue: () => external,
        subscribeValue(listener) {
          notify = listener;
          return () => undefined;
        },
        onValueChange(value) {
          external = value;
          notify();
        },
      },
      observed,
    );

    expect(synchronous.set(1, { reason: 'set' })).toBe(true);
    expect(synchronous.get()).toBe(1);
    expect(observed).not.toHaveBeenCalled();
    synchronous.destroy();

    external = 0;
    const reentrantHolder: { current?: ControllableValue<number, 'set'> } = {};
    const reentrant = createControllableValue<number, 'set'>(
      {
        defaultValue: -1,
        getValue: () => external,
        onValueChange(value) {
          if (value === 1) {
            reentrantHolder.current?.set(2, { reason: 'set' });
            external = 2;
          }
        },
      },
      vi.fn(),
    );
    reentrantHolder.current = reentrant;

    expect(reentrant.set(1, { reason: 'set' })).toBe(true);
    expect(reentrant.get()).toBe(2);
    reentrant.destroy();
  });
});
