import {
  createAccordion,
  createCollapsible,
  createCombobox,
  createCommandPalette,
  createContextMenu,
  createDialog,
  createDisclosure,
  createDropdownMenu,
  createListbox,
  createMenu,
  createNavigationMenu,
  createPopover,
  createTabs,
  createToast,
  createTooltip,
  createTreeView,
  type ContextMenuController,
  type DropdownMenuController,
  type EventSource,
  type MenuController,
  type RuntimeController,
} from 'ui-headless-runtime';
import type { ComponentId } from '../registry/components';

export interface DemoEvent {
  readonly name: string;
  readonly timestamp: number;
  readonly payload: unknown;
}

export interface ExampleInstance {
  readonly getSnapshot: () => Readonly<object>;
  readonly destroy: () => void;
}

const element = <TName extends keyof HTMLElementTagNameMap>(
  name: TName,
  text?: string,
): HTMLElementTagNameMap[TName] => {
  const node = document.createElement(name);
  if (text) node.textContent = text;
  return node;
};

const adapt = <TSnapshot extends object, TEvents extends object>(
  controller: RuntimeController<TSnapshot> & EventSource<TEvents>,
  render: (snapshot: Readonly<TSnapshot>) => void,
  onEvent: (event: DemoEvent) => void,
  cleanup: () => void = () => undefined,
  eventNames: readonly (keyof TEvents)[] = ['stateChange' as keyof TEvents],
): ExampleInstance => {
  const started = performance.now();
  render(controller.getSnapshot());
  const unsubscribe = controller.subscribe((snapshot) => {
    render(snapshot);
  });
  const eventCleanups = eventNames.map((name) =>
    controller.on(name, (event) =>
      onEvent({
        name: String(name),
        timestamp: performance.now() - started,
        payload: event.detail,
      }),
    ),
  );
  return {
    getSnapshot: () => controller.getSnapshot(),
    destroy() {
      unsubscribe();
      eventCleanups.forEach((release) => release());
      cleanup();
      controller.destroy();
    },
  };
};

const button = (label: string, onClick: () => void): HTMLButtonElement => {
  const node = element('button', label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
};

export function createExample(
  id: ComponentId,
  scenario: string,
  mount: HTMLElement,
  onEvent: (event: DemoEvent) => void,
): ExampleInstance {
  mount.replaceChildren();
  const stage = element('div');
  stage.className = 'example-stage';
  stage.dataset.scenario = scenario;
  mount.append(stage);

  if (id === 'dialog') {
    const controller = createDialog({ modal: scenario !== 'non-modal' });
    const trigger = button('Open dialog', () => controller.open({ reason: 'trigger' }));
    const content = element('section');
    content.setAttribute('aria-label', 'Account confirmation');
    content.className = 'overlay-surface';
    const heading = element('h3', 'Confirm account change');
    content.append(
      heading,
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
        nestedContent.setAttribute('aria-modal', String(snapshot.ariaModal));
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
    return adapt(
      controller,
      (snapshot) => {
        content.hidden = !snapshot.open;
        content.setAttribute('role', snapshot.role);
        content.setAttribute('aria-modal', String(snapshot.ariaModal));
      },
      onEvent,
      () => {
        destroyNested();
        unbind();
      },
    );
  }

  if (id === 'popover') {
    let controlledOpen = false;
    let notify = (): void => undefined;
    const controller = createPopover({
      positioning: { placement: scenario === 'edge' ? 'top-end' : 'bottom-start' },
      ...(scenario === 'controlled'
        ? {
            getValue: () => controlledOpen,
            onValueChange(value: boolean) {
              controlledOpen = value;
              notify();
            },
            subscribeValue(listener: () => void) {
              notify = listener;
              return () => undefined;
            },
          }
        : {}),
    });
    const trigger = button('Toggle details', () => controller.toggle({ reason: 'trigger' }));
    const content = element('section');
    content.className = 'overlay-surface';
    content.setAttribute('aria-label', 'Deployment details');
    content.append(element('p', 'Coordinates come from the shared positioning engine.'));
    stage.append(trigger, content);
    const unbind = controller.bind({ trigger, content });
    return adapt(
      controller,
      (snapshot) => {
        content.hidden = !snapshot.open;
        if (snapshot.position) {
          content.style.left = `${snapshot.position.x}px`;
          content.style.top = `${snapshot.position.y}px`;
        }
      },
      onEvent,
      unbind,
    );
  }

  if (id === 'tooltip') {
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
    return adapt(
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
      onEvent,
      () => {
        destroySibling();
        unbind();
      },
    );
  }

  if (id === 'disclosure' || id === 'collapsible') {
    let controlledExpanded = false;
    let notify = (): void => undefined;
    const options = {
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
      ...(scenario === 'disabled' ? { disabled: true } : {}),
    };
    const controller = id === 'disclosure' ? createDisclosure(options) : createCollapsible(options);
    const trigger = button(id === 'disclosure' ? 'Deployment notes' : 'Advanced settings', () =>
      controller.toggle({ reason: 'trigger' }),
    );
    const panel = element('div', 'The consumer renders this panel and owns every visual decision.');
    panel.className = 'example-panel';
    stage.append(trigger, panel);
    return adapt(
      controller,
      (snapshot) => {
        trigger.id = snapshot.trigger.id;
        trigger.setAttribute('aria-controls', snapshot.trigger.ariaControls);
        trigger.setAttribute('aria-expanded', String(snapshot.expanded));
        trigger.disabled = snapshot.disabled;
        panel.id = snapshot.panel.id;
        panel.hidden = snapshot.panel.hidden;
        panel.setAttribute('aria-labelledby', snapshot.panel.ariaLabelledby);
      },
      onEvent,
    );
  }

  if (id === 'accordion') {
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
    return adapt(
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
      onEvent,
      () => cleanups.forEach((cleanup) => cleanup()),
    );
  }

  if (id === 'tabs') {
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
    return adapt(
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
      onEvent,
      () => cleanups.forEach((cleanup) => cleanup()),
    );
  }

  if (id === 'toast') {
    const controller = createToast({ maxVisible: 2 });
    const region = element('div');
    region.className = 'toast-region';
    region.setAttribute('role', 'region');
    region.setAttribute('aria-label', 'Notifications');
    let pausableId: string | undefined;
    let paused = false;
    const action =
      scenario === 'queue'
        ? button('Create priority queue', () => {
            controller.show({ id: 'low', message: 'Background sync', priority: 0, duration: null });
            controller.show({
              id: 'urgent',
              message: 'Deployment failed',
              priority: 10,
              duration: null,
              politeness: 'assertive',
              status: 'error',
            });
            controller.show({
              id: 'medium',
              message: 'Review requested',
              priority: 5,
              duration: null,
            });
          })
        : scenario === 'promise'
          ? button('Track deployment promise', () => {
              void controller.promise(Promise.resolve('production'), {
                loading: 'Deploying…',
                success: (target) => `Deployed to ${target}`,
                error: 'Deployment failed',
              });
            })
          : button('Create pausable notification', () => {
              pausableId ??= controller.show({
                id: 'pausable',
                message: 'Import in progress',
                duration: 5000,
              });
              if (paused) controller.resume(pausableId);
              else controller.pause(pausableId);
              paused = !paused;
            });
    stage.append(action, region);
    return adapt(
      controller,
      (snapshot) => {
        region.replaceChildren(
          ...snapshot.visible.map((toast) => {
            const item = element('div');
            item.className = 'toast';
            item.setAttribute('role', toast.politeness === 'assertive' ? 'alert' : 'status');
            item.append(
              element('span', toast.message),
              button(`Dismiss ${toast.message}`, () => controller.dismiss(toast.id)),
            );
            return item;
          }),
        );
      },
      onEvent,
    );
  }

  if (id === 'listbox') {
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
    return adapt(
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
      onEvent,
      () => cleanups.forEach((cleanup) => cleanup()),
    );
  }

  if (id === 'combobox') {
    const controller = createCombobox({
      ...(scenario === 'empty' ? { filter: () => false } : {}),
      ...(scenario === 'async'
        ? {
            loadOptions(query: string, signal: AbortSignal) {
              return new Promise<readonly { id: string; text: string; value: string }[]>(
                (resolve, reject) => {
                  const timer = window.setTimeout(
                    () =>
                      resolve([{ id: `remote-${query}`, text: `${query} (remote)`, value: query }]),
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
    return adapt(
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
      onEvent,
      () => {
        unbind();
        cleanups.forEach((cleanup) => cleanup());
      },
    );
  }

  if (id === 'tree-view') {
    const controller = createTreeView();
    const tree = element('div');
    tree.className = 'tree';
    tree.tabIndex = 0;
    tree.setAttribute('role', 'tree');
    tree.setAttribute('aria-label', 'Workspace hierarchy');
    tree.addEventListener('keydown', (event) => controller.handleKeyDown(event));
    stage.append(tree);
    const cleanups = [
      controller.registerNode({
        id: 'workspace',
        text: 'Workspace',
        hasChildren: true,
        loading: scenario === 'dynamic',
      }),
      controller.registerNode({ id: 'design', text: 'Design', parentId: 'workspace' }),
      controller.registerNode({
        id: 'engineering',
        text: 'Engineering',
        parentId: 'workspace',
        hasChildren: true,
      }),
      controller.registerNode({ id: 'web', text: 'Web platform', parentId: 'engineering' }),
      ...(scenario === 'disabled'
        ? [
            controller.registerNode({
              id: 'archive',
              text: 'Archive',
              parentId: 'workspace',
              disabled: true,
            }),
          ]
        : []),
    ];
    controller.toggle('workspace');
    if (scenario === 'dynamic') {
      stage.append(
        button('Finish loading workspace', () => {
          cleanups.push(
            controller.registerNode({
              id: 'workspace',
              text: 'Workspace',
              hasChildren: true,
              loading: false,
            }),
          );
        }),
      );
    }
    return adapt(
      controller,
      (snapshot) => {
        tree.replaceChildren(
          ...snapshot.visibleNodes.map((node) => {
            const item = button(`${'· '.repeat(node.level - 1)}${node.id}`, () =>
              node.expanded ? controller.select(node.id) : controller.toggle(node.id),
            );
            item.setAttribute('role', 'treeitem');
            item.tabIndex = -1;
            item.id = node.id;
            item.setAttribute('aria-level', String(node.level));
            item.setAttribute('aria-setsize', String(node.setSize));
            item.setAttribute('aria-posinset', String(node.positionInSet));
            item.setAttribute('aria-selected', String(node.selected));
            item.setAttribute('aria-disabled', String(node.disabled));
            item.setAttribute('aria-busy', String(node.loading));
            item.disabled = node.disabled;
            return item;
          }),
        );
      },
      onEvent,
      () => cleanups.forEach((cleanup) => cleanup()),
    );
  }

  if (id === 'command-palette') {
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
    return adapt(
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
        if (snapshot.activeId)
          input.setAttribute('aria-activedescendant', `command-option-${snapshot.activeId}`);
        else input.removeAttribute('aria-activedescendant');
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
      onEvent,
      () => {
        unbind();
        cleanups.forEach((cleanup) => cleanup());
      },
    );
  }

  if (id === 'navigation-menu') {
    const controller = createNavigationMenu({
      mode: scenario === 'compact' ? 'compact' : 'desktop',
    });
    const nav = element('nav');
    nav.setAttribute('aria-label', 'Example navigation');
    const panel = element('div', 'Mega-menu content is positioned without runtime CSS.');
    panel.className = 'example-panel';
    panel.setAttribute('aria-label', 'Navigation content');
    const cleanups: (() => void)[] = [];
    const triggers: HTMLButtonElement[] = [];
    for (const [itemId, label] of [
      ['products', 'Products'],
      ['solutions', 'Solutions'],
    ] as const) {
      const item = button(label, () => controller.openItem(itemId, { reason: 'pointer' }));
      item.addEventListener('pointerenter', (event) => controller.scheduleOpen(itemId, event));
      item.addEventListener('pointerleave', (event) => controller.scheduleClose(event));
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
    return adapt(
      controller,
      (snapshot) => {
        panel.hidden = snapshot.openId === null;
        panel.style.left = snapshot.position ? `${snapshot.position.x}px` : '';
        panel.style.top = snapshot.position ? `${snapshot.position.y}px` : '';
        triggers.forEach((trigger, index) => {
          const item = snapshot.items[index];
          trigger.setAttribute('aria-expanded', String(item?.id === snapshot.openId));
        });
      },
      onEvent,
      () => {
        releaseBinding();
        cleanups.forEach((cleanup) => cleanup());
      },
    );
  }

  const menu =
    id === 'dropdown-menu'
      ? createDropdownMenu()
      : id === 'context-menu'
        ? createContextMenu()
        : createMenu();
  const trigger = button(id === 'context-menu' ? 'Right-click project' : 'Open actions', () =>
    menu.open({ reason: 'trigger' }),
  );
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
  for (const [itemId, label] of itemDefinitions) {
    const item = button(label, () => menu.select(itemId, { reason: 'pointer' }));
    item.setAttribute('role', 'menuitem');
    item.tabIndex = -1;
    const disabled = scenario === 'disabled' && itemId === 'archive';
    item.disabled = disabled;
    item.setAttribute('aria-disabled', String(disabled));
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
  stage.append(trigger, content, submenuStatus);
  const unbind = menu.bind({ trigger, content });
  return adapt(
    menu,
    (snapshot) => {
      content.hidden = !snapshot.open;
      submenuStatus.hidden = scenario !== 'submenu';
      submenuStatus.textContent = snapshot.openSubmenuId
        ? `Requested submenu: ${snapshot.openSubmenuId}`
        : 'Submenu closed';
    },
    onEvent,
    () => {
      unbind();
      cleanups.forEach((cleanup) => cleanup());
    },
  );
}
