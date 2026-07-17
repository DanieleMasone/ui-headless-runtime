import { createNavigationMenu } from 'ui-headless-runtime';
import { adaptController } from './shared/controller-adapter';
import { button, createStage, element } from './shared/dom';
import type { ExampleContext, ExampleInstance } from './shared/types';

export default function createNavigationMenuExample({
  scenario,
  mount,
  emit,
}: ExampleContext): ExampleInstance {
  const stage = createStage(mount, scenario);
  const controller = createNavigationMenu({
    mode: scenario === 'compact' ? 'compact' : 'desktop',
  });
  const nav = element('nav');
  nav.setAttribute('aria-label', 'Example navigation');
  const panel = element('div', 'Mega-menu content is positioned without runtime CSS.');
  panel.id = controller.getSnapshot().contentId;
  panel.className = 'example-panel';
  panel.setAttribute('aria-label', 'Navigation content');
  const cleanups: (() => void)[] = [];
  const triggers: HTMLButtonElement[] = [];
  for (const [itemId, label] of [
    ['products', 'Products'],
    ['solutions', 'Solutions'],
  ] as const) {
    const item = button(label, () => {
      if (controller.getSnapshot().openId === itemId) controller.close({ reason: 'pointer' });
      else controller.openItem(itemId, { reason: 'pointer' });
    });
    item.setAttribute('aria-controls', panel.id);
    if (scenario !== 'compact') {
      item.addEventListener('pointerenter', (event) => controller.scheduleOpen(itemId, event));
      item.addEventListener('pointerleave', (event) => controller.scheduleClose(event));
    }
    item.addEventListener('keydown', (event) => controller.handleKeyDown(event));
    nav.append(item);
    triggers.push(item);
    cleanups.push(controller.registerItem({ id: itemId, text: label, hasContent: true }, item));
  }
  if (scenario === 'mega') {
    panel.replaceChildren(
      element('strong', 'Product platform'),
      element('a', 'Runtime architecture'),
      element('a', 'Accessibility guidance'),
    );
    panel.querySelectorAll('a').forEach((link, index) => {
      link.href = index === 0 ? '#/architecture' : '#/architecture/accessibility';
    });
  }
  stage.append(nav, panel);
  const releaseBinding = controller.bind({
    ...(triggers[0] ? { trigger: triggers[0], anchor: triggers[0] } : {}),
    content: panel,
  });
  return adaptController(
    controller,
    (snapshot) => {
      panel.id = snapshot.contentId;
      panel.hidden = snapshot.openId === null;
      panel.style.left = snapshot.position ? `${snapshot.position.x}px` : '';
      panel.style.top = snapshot.position ? `${snapshot.position.y}px` : '';
      triggers.forEach((trigger, index) => {
        const item = snapshot.items[index];
        trigger.setAttribute('aria-controls', snapshot.contentId);
        trigger.setAttribute('aria-expanded', String(item?.id === snapshot.openId));
      });
    },
    emit,
    () => {
      releaseBinding();
      cleanups.forEach((cleanup) => cleanup());
    },
  );
}
