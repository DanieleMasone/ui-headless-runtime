import { createListbox } from 'ui-headless-runtime';
import { adaptController } from './shared/controller-adapter';
import { button, createStage, element } from './shared/dom';
import type { ExampleContext, ExampleInstance } from './shared/types';

export default function createListboxExample({
  scenario,
  mount,
  emit,
}: ExampleContext): ExampleInstance {
  const stage = createStage(mount, scenario);
  const controller = createListbox({
    selectionMode: scenario === 'multiple' ? 'multiple' : 'single',
  });
  const box = element('div');
  box.className = 'listbox';
  box.tabIndex = 0;
  box.setAttribute('role', 'listbox');
  box.setAttribute('aria-label', 'Deployment region');
  box.addEventListener('keydown', (event) => controller.handleKeyDown(event));
  const cleanups: (() => void)[] = [];
  for (const [optionId, label] of [
    ['rome', 'Rome'],
    ['berlin', 'Berlin'],
    ['oslo', 'Oslo'],
  ] as const) {
    const option = button(label, () => controller.select(optionId, { reason: 'pointer' }));
    option.setAttribute('role', 'option');
    option.tabIndex = -1;
    const disabled = scenario === 'disabled' && optionId === 'berlin';
    option.disabled = disabled;
    box.append(option);
    cleanups.push(controller.registerOption({ id: optionId, text: label, disabled }));
  }
  stage.append(box);
  return adaptController(
    controller,
    (snapshot) => {
      box.id = snapshot.id;
      box.setAttribute('aria-multiselectable', String(snapshot.ariaMultiselectable));
      if (snapshot.activeId) box.setAttribute('aria-activedescendant', snapshot.activeId);
      else box.removeAttribute('aria-activedescendant');
      snapshot.options.forEach((option, index) => {
        const item = box.children.item(index);
        item?.setAttribute('id', option.id);
        item?.setAttribute('aria-selected', String(option.selected));
        item?.setAttribute('aria-disabled', String(option.disabled));
      });
    },
    emit,
    () => cleanups.forEach((cleanup) => cleanup()),
  );
}
