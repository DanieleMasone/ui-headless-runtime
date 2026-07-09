import { createDialog } from 'ui-headless-runtime';
import { adaptController } from './shared/controller-adapter';
import { button, createStage, element } from './shared/dom';
import type { ExampleContext, ExampleInstance } from './shared/types';

export default function createDialogExample({
  scenario,
  mount,
  emit,
}: ExampleContext): ExampleInstance {
  const stage = createStage(mount, scenario);
  const controller = createDialog({ modal: scenario !== 'non-modal' });
  const trigger = button('Open dialog', () => controller.open({ reason: 'trigger' }));
  const content = element('section');
  content.setAttribute('aria-label', 'Account confirmation');
  content.className = 'overlay-surface';
  content.append(
    element('h3', 'Confirm account change'),
    element('p', 'This focus scope is controlled entirely by the runtime.'),
  );
  if (scenario !== 'no-tabbable') {
    content.append(button('Close dialog', () => controller.close()));
  }

  let releaseNested = (): void => undefined;
  let destroyNested = (): void => undefined;
  if (scenario === 'nested') {
    const nested = createDialog({ id: 'nested-dialog' });
    const nestedTrigger = button('Open nested dialog', () => nested.open({ reason: 'trigger' }));
    const nestedContent = element('section');
    nestedContent.className = 'overlay-surface';
    nestedContent.setAttribute('aria-label', 'Nested confirmation');
    nestedContent.append(
      element('h4', 'Nested confirmation'),
      button('Close nested dialog', () => nested.close()),
    );
    content.append(nestedTrigger, nestedContent);
    releaseNested = nested.bind({ trigger: nestedTrigger, content: nestedContent });
    const releaseRender = nested.subscribe((snapshot) => {
      nestedContent.hidden = !snapshot.open;
      nestedContent.setAttribute('role', snapshot.role);
      if (snapshot.ariaModal) nestedContent.setAttribute('aria-modal', 'true');
      else nestedContent.removeAttribute('aria-modal');
    });
    nestedContent.hidden = true;
    destroyNested = () => {
      releaseRender();
      releaseNested();
      nested.destroy();
    };
  }

  stage.append(trigger, content);
  const unbind = controller.bind({ trigger, content });
  return adaptController(
    controller,
    (snapshot) => {
      content.hidden = !snapshot.open;
      content.setAttribute('role', snapshot.role);
      if (snapshot.ariaModal) content.setAttribute('aria-modal', 'true');
      else content.removeAttribute('aria-modal');
    },
    emit,
    () => {
      destroyNested();
      unbind();
    },
  );
}
