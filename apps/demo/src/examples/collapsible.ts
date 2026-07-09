import { createCollapsible } from 'ui-headless-runtime';
import { adaptController } from './shared/controller-adapter';
import { button, createStage, element } from './shared/dom';
import type { ExampleContext, ExampleInstance } from './shared/types';

export default function createCollapsibleExample({
  scenario,
  mount,
  emit,
}: ExampleContext): ExampleInstance {
  const stage = createStage(mount, scenario);
  let controlledExpanded = false;
  let notify = (): void => undefined;
  const controller = createCollapsible({
    ...(scenario === 'controlled'
      ? {
          getValue: () => controlledExpanded,
          onValueChange(value: boolean) {
            controlledExpanded = value;
            notify();
          },
          subscribeValue(listener: () => void) {
            notify = listener;
            return () => undefined;
          },
        }
      : {}),
  });
  const trigger = button('Advanced settings', () => controller.toggle({ reason: 'trigger' }));
  const panel = element('div', 'The consumer renders this panel and owns every visual decision.');
  panel.className = 'example-panel';
  stage.append(trigger, panel);
  return adaptController(
    controller,
    (snapshot) => {
      trigger.id = snapshot.trigger.id;
      trigger.setAttribute('aria-controls', snapshot.trigger.ariaControls);
      trigger.setAttribute('aria-expanded', String(snapshot.expanded));
      panel.id = snapshot.panel.id;
      panel.hidden = snapshot.panel.hidden;
      panel.setAttribute('aria-labelledby', snapshot.panel.ariaLabelledby);
    },
    emit,
  );
}
