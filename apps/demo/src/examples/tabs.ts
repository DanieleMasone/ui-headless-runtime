import { createTabs } from 'ui-headless-runtime';
import { adaptController } from './shared/controller-adapter';
import { button, createStage, element } from './shared/dom';
import type { ExampleContext, ExampleInstance } from './shared/types';

export default function createTabsExample({
  scenario,
  mount,
  emit,
}: ExampleContext): ExampleInstance {
  const stage = createStage(mount, scenario);
  const controller = createTabs({
    activation: scenario === 'manual' ? 'manual' : 'automatic',
    orientation: scenario === 'vertical' ? 'vertical' : 'horizontal',
  });
  const tablist = element('div');
  tablist.className = 'tab-list';
  tablist.setAttribute('role', 'tablist');
  const panels = new Map<string, HTMLElement>();
  const tabElements = new Map<string, HTMLButtonElement>();
  const cleanups: (() => void)[] = [];
  for (const [tabId, label] of [
    ['activity', 'Activity'],
    ['members', 'Members'],
    ['policies', 'Policies'],
  ] as const) {
    const tab = button(label, () => controller.select(tabId, { reason: 'pointer' }));
    tab.setAttribute('role', 'tab');
    tab.addEventListener('keydown', (event) => controller.handleKeyDown(tabId, event));
    tablist.append(tab);
    tabElements.set(tabId, tab);
    const panel = element('div', `${label} workspace content.`);
    panel.setAttribute('role', 'tabpanel');
    panels.set(tabId, panel);
    stage.append(panel);
    cleanups.push(controller.registerTab({ id: tabId, text: label }, tab));
  }
  stage.prepend(tablist);
  return adaptController(
    controller,
    (snapshot) => {
      for (const item of snapshot.items) {
        const tab = tabElements.get(item.id);
        if (tab) {
          tab.id = item.tabId;
          tab.tabIndex = item.tabIndex;
          tab.setAttribute('aria-controls', item.panelId);
          tab.setAttribute('aria-selected', String(item.selected));
        }
        const panel = panels.get(item.id);
        if (panel) {
          panel.id = item.panelId;
          panel.setAttribute('aria-labelledby', item.tabId);
          panel.hidden = !item.selected;
        }
      }
    },
    emit,
    () => cleanups.forEach((cleanup) => cleanup()),
  );
}
