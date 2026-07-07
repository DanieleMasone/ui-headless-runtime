import { createControllerHost } from './host';
import type { RuntimeController } from './types';

/** Internal snapshot projection used by derived controllers without duplicating subscriptions. */
export interface SnapshotProjection<TSnapshot extends object> extends RuntimeController<TSnapshot> {
  refresh(): void;
}

/** Creates a lifecycle-safe derived snapshot and optionally owns the source controller. */
export function createSnapshotProjection<TSource extends object, TSnapshot extends object>(
  source: RuntimeController<TSource>,
  project: (snapshot: Readonly<TSource>) => TSnapshot,
  destroySource = true,
): SnapshotProjection<TSnapshot> {
  const host = createControllerHost<TSnapshot, Record<never, never>>(project(source.getSnapshot()));
  const refresh = (): void => {
    if (host.alive()) host.update(project(source.getSnapshot()));
  };
  if (destroySource) host.resources.add(() => source.destroy());
  host.resources.add(source.subscribe(refresh));
  return {
    getSnapshot: host.getSnapshot,
    subscribe: host.subscribe,
    refresh,
    destroy: host.destroy,
  };
}
