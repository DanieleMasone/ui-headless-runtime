import { createAccordion } from 'ui-headless-runtime';
import { adaptController } from './shared/controller-adapter';
import { button, createStage, element } from './shared/dom';
import type { ExampleContext, ExampleInstance } from './shared/types';

export default function createAccordionExample({
  scenario,
  mount,
  emit,
}: ExampleContext): ExampleInstance {
  const stage = createStage(mount, scenario);
  const controller = createAccordion({
    type: scenario === 'multiple' ? 'multiple' : 'single',
    collapsible: true,
  });
  const cleanups: (() => void)[] = [];
  const rows = new Map<string, { trigger: HTMLButtonElement; panel: HTMLElement }>();
  for (const [itemId, label] of [
    ['overview', 'Overview'],
    ['security', 'Security'],
    ['billing', 'Billing'],
  ] as const) {
    const trigger = button(label, () => controller.toggle(itemId, { reason: 'trigger' }));
    const panel = element('div', `${label} settings and operational notes.`);
    panel.className = 'example-panel';
    stage.append(trigger, panel);
    rows.set(itemId, { trigger, panel });
    cleanups.push(controller.registerItem({ id: itemId, text: label }, trigger));
  }
  if (scenario === 'dynamic') {
    const billing = rows.get('billing');
    const removeBilling = button('Remove Billing section', () => {
      cleanups[2]?.();
      billing?.trigger.remove();
      billing?.panel.remove();
    });
    stage.append(removeBilling);
  }
  return adaptController(
    controller,
    (snapshot) => {
      for (const item of snapshot.items) {
        const row = rows.get(item.id);
        if (!row) continue;
        row.trigger.id = item.triggerId;
        row.trigger.setAttribute('aria-controls', item.panelId);
        row.trigger.setAttribute('aria-expanded', String(item.expanded));
        row.panel.id = item.panelId;
        row.panel.setAttribute('aria-labelledby', item.triggerId);
        row.panel.hidden = !item.expanded;
      }
    },
    emit,
    () => cleanups.forEach((cleanup) => cleanup()),
  );
}
