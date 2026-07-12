import {
  createContextMenu,
  createDropdownMenu,
  createMenu,
  type ContextMenuController,
  type DropdownMenuController,
  type MenuController,
} from 'ui-headless-runtime';
import { adaptController } from './controller-adapter';
import { button, createStage, element } from './dom';
import type { ExampleContext, ExampleInstance } from './types';

export type MenuKind = 'menu' | 'dropdown-menu' | 'context-menu';

export function createMenuFamilyExample(
  { scenario, mount, emit }: ExampleContext,
  kind: MenuKind,
): ExampleInstance {
  const stage = createStage(mount, scenario);
  const menu =
    kind === 'dropdown-menu'
      ? createDropdownMenu()
      : kind === 'context-menu'
        ? createContextMenu()
        : createMenu();
  const trigger = button(kind === 'context-menu' ? 'Right-click project' : 'Open actions', () => {
    if (kind !== 'context-menu') menu.open({ reason: 'trigger' });
  });
  const content = element('div');
  content.className = 'menu-surface';
  content.setAttribute('role', 'menu');
  content.setAttribute('aria-label', 'Project actions');
  content.tabIndex = 0;
  content.addEventListener('keydown', (event) => menu.handleKeyDown(event));

  const isContextMenu = (value: MenuController): value is ContextMenuController =>
    'handleContextMenu' in value;
  const isDropdownMenu = (value: MenuController): value is DropdownMenuController =>
    'handleTrigger' in value;
  if (isContextMenu(menu)) {
    trigger.addEventListener('contextmenu', (event) => {
      menu.handleContextMenu(event, content);
    });
    trigger.addEventListener('keydown', (event) => {
      menu.handleKeyboardOpen(event, trigger, content);
    });
  } else if (isDropdownMenu(menu)) {
    trigger.addEventListener('keydown', (event) => menu.handleTrigger(event));
  }

  const cleanups: (() => void)[] = [];
  const itemDefinitions: [string, string][] = [
    ['rename', 'Rename'],
    ['duplicate', 'Duplicate'],
    ['archive', 'Archive'],
  ];
  if (scenario === 'long') {
    itemDefinitions.push(
      ['move', 'Move'],
      ['share', 'Share'],
      ['download', 'Download'],
      ['delete', 'Delete'],
    );
  }
  const submenuStatus = element('p', 'Submenu closed');
  const itemElements = new Map<string, HTMLButtonElement>();
  for (const [itemId, label] of itemDefinitions) {
    const item = button(label, () => menu.select(itemId, { reason: 'pointer' }));
    item.setAttribute('role', 'menuitem');
    item.tabIndex = -1;
    const disabled = scenario === 'disabled' && itemId === 'archive';
    item.disabled = disabled;
    item.setAttribute('aria-disabled', String(disabled));
    itemElements.set(itemId, item);
    content.append(item);
    cleanups.push(
      menu.registerItem(
        {
          id: itemId,
          text: label,
          disabled,
          ...(scenario === 'submenu' && itemId === 'duplicate'
            ? { submenuId: 'duplicate-actions' }
            : {}),
        },
        item,
      ),
    );
  }

  const submenuContent = element('div');
  submenuContent.id = 'duplicate-actions';
  submenuContent.className = 'menu-surface';
  submenuContent.setAttribute('role', 'menu');
  submenuContent.setAttribute('aria-label', 'Duplicate actions');
  submenuContent.tabIndex = 0;
  submenuContent.hidden = true;
  if (scenario === 'submenu') {
    const submenu = createMenu({ id: 'duplicate-actions' });
    const duplicateTrigger = itemElements.get('duplicate');
    if (duplicateTrigger) {
      duplicateTrigger.setAttribute('aria-haspopup', 'menu');
      duplicateTrigger.setAttribute('aria-controls', 'duplicate-actions');
      for (const [itemId, label] of [
        ['same-project', 'Duplicate in this project'],
        ['another-project', 'Duplicate to another project'],
      ] as const) {
        const item = button(label, () => submenu.select(itemId, { reason: 'pointer' }));
        item.setAttribute('role', 'menuitem');
        item.tabIndex = -1;
        submenuContent.append(item);
        cleanups.push(submenu.registerItem({ id: itemId, text: label }, item));
      }
      submenuContent.addEventListener('keydown', (event) => submenu.handleKeyDown(event));
      cleanups.push(submenu.bind({ trigger: duplicateTrigger, content: submenuContent }));
      cleanups.push(menu.registerSubmenu('duplicate', submenu));
      cleanups.push(
        submenu.subscribe((snapshot) => {
          submenuContent.hidden = !snapshot.open;
          duplicateTrigger.setAttribute('aria-expanded', String(snapshot.open));
        }),
      );
      cleanups.push(() => submenu.destroy());
    }
  }

  stage.append(trigger, content, submenuContent, submenuStatus);
  const unbind = menu.bind({ trigger, content });
  return adaptController(
    menu,
    (snapshot) => {
      content.hidden = !snapshot.open;
      submenuStatus.hidden = scenario !== 'submenu';
      submenuStatus.textContent = snapshot.openSubmenuId
        ? `Open submenu: ${snapshot.openSubmenuId}`
        : 'Submenu closed';
    },
    emit,
    () => {
      unbind();
      cleanups.forEach((cleanup) => cleanup());
    },
  );
}
