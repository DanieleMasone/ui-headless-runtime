import { createPopover } from 'ui-headless-runtime';
import { adaptController } from './shared/controller-adapter';
import { button, createStage, element } from './shared/dom';
import type { ExampleContext, ExampleInstance } from './shared/types';

export default function createPopoverExample({
  scenario,
  mount,
  emit,
}: ExampleContext): ExampleInstance {
  const stage = createStage(mount, scenario);
  let controlledOpen = false;
  let notify = (): void => undefined;
  const controller = createPopover({
    positioning: { placement: scenario === 'edge' ? 'top-end' : 'bottom-start' },
    ...(scenario === 'controlled'
      ? {
          getValue: () => controlledOpen,
          onValueChange(value: boolean) {
            controlledOpen = value;
            notify();
          },
          subscribeValue(listener: () => void) {
            notify = listener;
            return () => undefined;
          },
        }
      : {}),
  });
  const trigger = button('Toggle details', () => controller.toggle({ reason: 'trigger' }));
  const content = element('section');
  content.className = 'overlay-surface';
  content.setAttribute('aria-label', 'Deployment details');
  content.append(element('p', 'Coordinates come from the shared positioning engine.'));
  stage.append(trigger, content);
  const unbind = controller.bind({ trigger, content });
  return adaptController(
    controller,
    (snapshot) => {
      content.hidden = !snapshot.open;
      if (snapshot.position) {
        content.style.left = `${snapshot.position.x}px`;
        content.style.top = `${snapshot.position.y}px`;
      }
    },
    emit,
    unbind,
  );
}
