import { createCombobox } from 'ui-headless-runtime';
import { adaptController } from './shared/controller-adapter';
import { button, createStage, element } from './shared/dom';
import type { ExampleContext, ExampleInstance } from './shared/types';

export default function createComboboxExample({
  scenario,
  mount,
  emit,
}: ExampleContext): ExampleInstance {
  const stage = createStage(mount, scenario);
  const controller = createCombobox({
    ...(scenario === 'empty' ? { filter: () => false } : {}),
    ...(scenario === 'async'
      ? {
          loadOptions(query: string, signal: AbortSignal) {
            return new Promise<readonly { id: string; text: string; value: string }[]>(
              (resolvePromise, reject) => {
                const timer = window.setTimeout(
                  () =>
                    resolvePromise([
                      { id: `remote-${query}`, text: `${query} (remote)`, value: query },
                    ]),
                  query.length === 1 ? 80 : 20,
                );
                signal.addEventListener(
                  'abort',
                  () => {
                    window.clearTimeout(timer);
                    reject(new DOMException('Request aborted', 'AbortError'));
                  },
                  { once: true },
                );
              },
            );
          },
        }
      : {}),
  });
  const label = element('label', 'Assign owner');
  const input = element('input');
  label.append(input);
  const list = element('div');
  list.className = 'listbox';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Owner suggestions');
  stage.append(label, list);
  const cleanups =
    scenario === 'async'
      ? []
      : [
          controller.registerOption({ id: 'ada', text: 'Ada Lovelace', value: 'ada' }),
          controller.registerOption({ id: 'grace', text: 'Grace Hopper', value: 'grace' }),
          controller.registerOption({
            id: 'margaret',
            text: 'Margaret Hamilton',
            value: 'margaret',
          }),
        ];
  input.addEventListener('input', (event) => controller.handleInput(event));
  input.addEventListener('keydown', (event) => controller.handleKeyDown(event));
  const unbind = controller.bind({ trigger: input, anchor: input, content: list });
  return adaptController(
    controller,
    (snapshot) => {
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-controls', snapshot.listboxId);
      input.setAttribute('aria-expanded', String(snapshot.open));
      if (snapshot.activeId) input.setAttribute('aria-activedescendant', snapshot.activeId);
      else input.removeAttribute('aria-activedescendant');
      list.id = snapshot.listboxId;
      list.setAttribute('aria-busy', String(snapshot.loading));
      list.hidden = !snapshot.open;
      list.replaceChildren(
        ...snapshot.options.map((option) => {
          const item = button(option.text, () =>
            controller.select(option.id, { reason: 'pointer' }),
          );
          item.id = option.id;
          item.setAttribute('role', 'option');
          item.tabIndex = -1;
          item.setAttribute('aria-selected', String(snapshot.selectedValue === option.value));
          item.setAttribute('aria-disabled', String(option.disabled ?? false));
          return item;
        }),
      );
    },
    emit,
    () => {
      unbind();
      cleanups.forEach((cleanup) => cleanup());
    },
  );
}
