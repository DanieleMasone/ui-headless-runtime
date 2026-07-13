import type { RuntimeController, RuntimeEventSource } from 'ui-headless-runtime';
import type { DemoEvent, ExampleInstance } from './types';

export const adaptController = <TSnapshot extends object, TEvents extends object>(
  controller: RuntimeController<TSnapshot> & RuntimeEventSource<TEvents>,
  render: (snapshot: Readonly<TSnapshot>) => void,
  emit: (event: DemoEvent) => void,
  cleanup: () => void = () => undefined,
  eventNames: readonly (keyof TEvents)[] = ['stateChange' as keyof TEvents],
): ExampleInstance => {
  const started = performance.now();
  render(controller.getSnapshot());
  const unsubscribe = controller.subscribe((snapshot) => {
    render(snapshot);
  });
  const eventCleanups = eventNames.map((name) =>
    controller.on(name, (event) =>
      emit({
        name: String(name),
        timestamp: performance.now() - started,
        payload: event.detail,
      }),
    ),
  );
  return {
    getSnapshot: () => controller.getSnapshot(),
    destroy() {
      unsubscribe();
      eventCleanups.forEach((release) => release());
      cleanup();
      controller.destroy();
    },
  };
};
