import { createTooltip } from 'ui-headless-runtime';
import { adaptController } from './shared/controller-adapter';
import { button, createStage, element } from './shared/dom';
import type { ExampleContext, ExampleInstance } from './shared/types';

export default function createTooltipExample({
  scenario,
  mount,
  emit,
}: ExampleContext): ExampleInstance {
  const stage = createStage(mount, scenario);
  const controller = createTooltip({
    openDelay: scenario === 'focus' ? 0 : 300,
    scope: 'laboratory',
  });
  const trigger = button('Inspect deployment status', () => undefined);
  const content = element('div', 'Last successful deployment: 14 minutes ago');
  content.className = 'overlay-surface';
  content.setAttribute('role', 'tooltip');
  stage.append(trigger, content);
  const unbind = controller.bind(trigger, content);

  let destroySibling = (): void => undefined;
  if (scenario === 'scope') {
    const sibling = createTooltip({ id: 'sibling-tooltip', openDelay: 0, scope: 'laboratory' });
    const siblingTrigger = button('Inspect build status', () => undefined);
    const siblingContent = element('div', 'Build completed successfully');
    siblingContent.className = 'overlay-surface';
    siblingContent.setAttribute('role', 'tooltip');
    stage.append(siblingTrigger, siblingContent);
    const releaseBinding = sibling.bind(siblingTrigger, siblingContent);
    const renderSibling = (snapshot: ReturnType<typeof sibling.getSnapshot>): void => {
      siblingTrigger.id = snapshot.triggerId;
      if (snapshot.ariaDescribedby) {
        siblingTrigger.setAttribute('aria-describedby', snapshot.ariaDescribedby);
      } else siblingTrigger.removeAttribute('aria-describedby');
      siblingContent.id = snapshot.contentId;
      siblingContent.hidden = !snapshot.open;
    };
    renderSibling(sibling.getSnapshot());
    const releaseRender = sibling.subscribe(renderSibling);
    destroySibling = () => {
      releaseRender();
      releaseBinding();
      sibling.destroy();
    };
  }

  return adaptController(
    controller,
    (snapshot) => {
      trigger.id = snapshot.triggerId;
      if (snapshot.ariaDescribedby) {
        trigger.setAttribute('aria-describedby', snapshot.ariaDescribedby);
      } else {
        trigger.removeAttribute('aria-describedby');
      }
      content.id = snapshot.contentId;
      content.hidden = !snapshot.open;
    },
    emit,
    () => {
      destroySibling();
      unbind();
    },
  );
}
