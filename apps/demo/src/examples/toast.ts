import { createToast } from 'ui-headless-runtime';
import { adaptController } from './shared/controller-adapter';
import { button, createStage, element } from './shared/dom';
import type { ExampleContext, ExampleInstance } from './shared/types';

export default function createToastExample({
  scenario,
  mount,
  emit,
}: ExampleContext): ExampleInstance {
  const stage = createStage(mount, scenario);
  const controller = createToast({ maxVisible: 2 });
  const region = element('div');
  region.className = 'toast-region';
  region.setAttribute('role', 'region');
  region.setAttribute('aria-label', 'Notifications');
  const pauseBindings: (() => void)[] = [];
  let pausableId: string | undefined;
  let paused = false;
  const action =
    scenario === 'queue'
      ? button('Create priority queue', () => {
          controller.show({ id: 'low', message: 'Background sync', priority: 0, duration: null });
          controller.show({
            id: 'urgent',
            message: 'Deployment failed',
            priority: 10,
            duration: null,
            politeness: 'assertive',
            status: 'error',
          });
          controller.show({
            id: 'medium',
            message: 'Review requested',
            priority: 5,
            duration: null,
          });
        })
      : scenario === 'promise'
        ? button('Track deployment promise', () => {
            void controller.promise(Promise.resolve('production'), {
              loading: 'Deploying…',
              success: (target) => `Deployed to ${target}`,
              error: 'Deployment failed',
            });
          })
        : button('Create pausable notification', () => {
            pausableId ??= controller.show({
              id: 'pausable',
              message: 'Import in progress',
              duration: 5000,
            });
            if (paused) controller.resume(pausableId);
            else controller.pause(pausableId);
            paused = !paused;
          });
  stage.append(action, region);
  return adaptController(
    controller,
    (snapshot) => {
      pauseBindings.splice(0).forEach((cleanup) => cleanup());
      region.replaceChildren(
        ...snapshot.visible.map((toast) => {
          const item = element('div');
          item.className = 'toast';
          item.setAttribute('role', toast.politeness === 'assertive' ? 'alert' : 'status');
          item.append(
            element('span', toast.message),
            button(`Dismiss ${toast.message}`, () => controller.dismiss(toast.id)),
          );
          pauseBindings.push(controller.bindPause(toast.id, item));
          return item;
        }),
      );
    },
    emit,
    () => pauseBindings.splice(0).forEach((cleanup) => cleanup()),
  );
}
