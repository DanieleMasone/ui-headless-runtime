import { createCommandPalette } from 'ui-headless-runtime';
import { adaptController } from './shared/controller-adapter';
import { button, createStage, element } from './shared/dom';
import type { ExampleContext, ExampleInstance } from './shared/types';

export default function createCommandPaletteExample({
  scenario,
  mount,
  emit,
}: ExampleContext): ExampleInstance {
  const stage = createStage(mount, scenario);
  const controller = createCommandPalette({
    ...(scenario === 'empty' ? { defaultQuery: 'no matching command' } : {}),
  });
  const trigger = button('Open command palette', () => controller.open());
  const content = element('section');
  content.className = 'overlay-surface';
  content.setAttribute('aria-label', 'Command palette');
  const input = element('input');
  input.setAttribute('aria-label', 'Search commands');
  const results = element('div');
  results.id = 'command-palette-results';
  results.setAttribute('role', 'listbox');
  results.setAttribute('aria-label', 'Command results');
  content.append(input, results);
  stage.append(trigger, content);
  const cleanups = [
    controller.registerCommand({
      id: 'new',
      text: 'Create workspace',
      group: 'Workspace',
      perform: () => undefined,
    }),
    controller.registerCommand({
      id: 'invite',
      text: 'Invite member',
      group: 'People',
      perform: () => undefined,
    }),
  ];
  const unbind = controller.bind({ trigger, content });
  input.addEventListener('input', () => controller.setQuery(input.value, { reason: 'input' }));
  input.addEventListener('keydown', (event) => controller.handleKeyDown(event));
  return adaptController(
    controller,
    (snapshot) => {
      content.hidden = !snapshot.open;
      content.setAttribute('role', 'dialog');
      content.setAttribute('aria-modal', 'true');
      input.value = snapshot.query;
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-expanded', String(snapshot.open));
      input.setAttribute('aria-controls', results.id);
      input.setAttribute('aria-autocomplete', 'list');
      if (snapshot.activeId) {
        input.setAttribute('aria-activedescendant', `command-option-${snapshot.activeId}`);
      } else input.removeAttribute('aria-activedescendant');
      results.replaceChildren(
        ...snapshot.commands.map((command) => {
          const result = button(
            scenario === 'groups' && command.group
              ? `${command.group} — ${command.text}`
              : command.text,
            () => controller.select(command.id, { reason: 'pointer' }),
          );
          result.setAttribute('role', 'option');
          result.id = `command-option-${command.id}`;
          result.tabIndex = -1;
          result.setAttribute('aria-selected', String(command.id === snapshot.activeId));
          return result;
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
