import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAccordion,
  createCollapsible,
  createCommandPalette,
  createContextMenu,
  createDisclosure,
  createDropdownMenu,
  createListbox,
  createMenu,
  createNavigationMenu,
  createTabs,
  createTreeView,
  type OpenChangeEvent,
  type RuntimeEvent,
} from '../../packages/ui-headless-runtime/src/index';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const keyboard = (key: string, options: KeyboardEventInit = {}): KeyboardEvent =>
  new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true, ...options });

describe('Disclosure and Collapsible', () => {
  it('publishes relationships, lifecycle, cancellation, disabled state, and idempotent destroy', () => {
    const disclosure = createDisclosure({ id: 'account', defaultValue: false });
    const snapshots: boolean[] = [];
    const unsubscribe = disclosure.subscribe((snapshot) => snapshots.push(snapshot.expanded));
    const cancel = disclosure.on('beforeOpen', (event) => event.preventDefault());
    disclosure.expand();
    expect(disclosure.getSnapshot().expanded).toBe(false);
    cancel();
    disclosure.handleTriggerClick(new MouseEvent('click'));
    expect(disclosure.getSnapshot()).toMatchObject({
      expanded: true,
      trigger: { id: 'account-trigger', ariaControls: 'account-panel', ariaExpanded: true },
      panel: { id: 'account-panel', ariaLabelledby: 'account-trigger', hidden: false },
    });
    disclosure.setDisabled(true);
    disclosure.collapse();
    expect(disclosure.getSnapshot().expanded).toBe(true);
    disclosure.setDisabled(false);
    const space = keyboard(' ');
    disclosure.handleTriggerKeyDown(space);
    expect(space.defaultPrevented).toBe(true);
    expect(disclosure.getSnapshot().expanded).toBe(false);
    disclosure.handleTriggerKeyDown(keyboard('x'));
    disclosure.handleTriggerKeyDown(keyboard('Enter'));
    unsubscribe();
    disclosure.destroy();
    disclosure.destroy();
    disclosure.expand();
    expect(snapshots).toContain(true);
  });

  it('shares controlled state infrastructure and Collapsible implementation', () => {
    let expanded = false;
    let external: () => void = () => undefined;
    const onValueChange = vi.fn((value: boolean) => {
      expanded = value;
    });
    const disclosure = createCollapsible({
      getValue: () => expanded,
      onValueChange,
      subscribeValue(listener) {
        external = listener;
        return () => undefined;
      },
    });
    disclosure.toggle();
    external();
    expect(onValueChange).toHaveBeenCalledWith(true, { reason: 'programmatic' });
    expect(disclosure.getSnapshot()).toMatchObject({ expanded: true, controlled: true });
    disclosure.destroy();
  });

  it('keeps controlled Disclosure closed until the consumer commits', () => {
    let expanded = false;
    let notify: () => void = () => undefined;
    const disclosure = createDisclosure({
      getValue: () => expanded,
      onValueChange: vi.fn(),
      subscribeValue(listener) {
        notify = listener;
        return () => undefined;
      },
    });
    const opened = vi.fn();
    disclosure.on('open', opened);
    disclosure.expand({ reason: 'trigger' });
    expect(disclosure.getSnapshot().expanded).toBe(false);
    expect(opened).not.toHaveBeenCalled();
    expanded = true;
    notify();
    expect(disclosure.getSnapshot().expanded).toBe(true);
    expect(opened).toHaveBeenCalledOnce();
    disclosure.destroy();
  });

  it('uses the authoritative controlled Disclosure value for the initial snapshot', () => {
    const disclosure = createDisclosure({
      defaultValue: false,
      getValue: () => true,
    });

    expect(disclosure.getSnapshot()).toMatchObject({
      expanded: true,
      controlled: true,
      trigger: { ariaExpanded: true },
      panel: { hidden: false },
    });

    disclosure.destroy();
  });
});

describe('authoritative controlled initialization', () => {
  it('publishes collection and tree getters before any registration or notification', () => {
    const accordion = createAccordion({
      defaultValue: [],
      getValue: () => ['account'],
    });
    const tabs = createTabs({
      defaultValue: null,
      getValue: () => 'members',
    });
    const listbox = createListbox({
      defaultValue: [],
      getValue: () => ['rome'],
    });
    const tree = createTreeView({
      defaultExpandedIds: ['fallback'],
      defaultSelectedIds: ['fallback'],
      getExpandedIds: () => ['workspace'],
      getSelectedIds: () => ['design'],
    });

    expect(accordion.getSnapshot()).toMatchObject({
      controlled: true,
      expandedIds: ['account'],
    });
    expect(tabs.getSnapshot()).toMatchObject({ controlled: true, selectedId: 'members' });
    expect(listbox.getSnapshot()).toMatchObject({
      controlled: true,
      selectedValues: ['rome'],
    });
    expect(tree.getSnapshot()).toMatchObject({
      expansionControlled: true,
      selectionControlled: true,
      expandedIds: ['workspace'],
      selectedIds: ['design'],
    });

    accordion.destroy();
    tabs.destroy();
    listbox.destroy();
    tree.destroy();
  });

  it('publishes and activates the initial controlled Navigation Menu item', () => {
    const navigation = createNavigationMenu({
      defaultValue: null,
      getValue: () => 'products',
    });
    expect(navigation.getSnapshot()).toMatchObject({ controlled: true, openId: 'products' });

    const trigger = document.createElement('button');
    document.body.append(trigger);
    navigation.registerItem({ id: 'products', text: 'Products', hasContent: true }, trigger);
    expect(navigation.getSnapshot()).toMatchObject({
      openId: 'products',
      activeId: 'products',
    });

    navigation.destroy();
  });
});

describe('Accordion', () => {
  it('enforces single/multiple rules, dynamic cleanup and keyboard focus', () => {
    const accordion = createAccordion({ id: 'faq', type: 'single', collapsible: true });
    const first = document.createElement('button');
    const second = document.createElement('button');
    const third = document.createElement('button');
    document.body.append(first, second, third);
    const removeA = accordion.registerItem({ id: 'a', text: 'Alpha' }, first);
    accordion.registerItem({ id: 'b', text: 'Beta', disabled: true }, second);
    accordion.registerItem({ id: 'c', text: 'Charlie' }, third);
    expect(accordion.getSnapshot().items.map((item) => item.tabIndex)).toEqual([0, -1, -1]);
    const cancel = accordion.on('beforeChange', (event) => event.preventDefault());
    accordion.toggle('a');
    expect(accordion.getSnapshot().expandedIds).toEqual([]);
    cancel();
    accordion.toggle('a', { reason: 'trigger' });
    expect(accordion.getSnapshot().expandedIds).toEqual(['a']);
    accordion.toggle('a');
    expect(accordion.getSnapshot().expandedIds).toEqual([]);
    accordion.toggle('b');
    expect(accordion.getSnapshot().expandedIds).toEqual([]);
    accordion.handleTriggerKeyDown('a', keyboard('End'));
    expect(accordion.getSnapshot().focusedId).toBe('c');
    expect(accordion.getSnapshot().items.map((item) => item.tabIndex)).toEqual([-1, -1, 0]);
    expect(document.activeElement).toBe(third);
    accordion.handleTriggerKeyDown('c', keyboard('ArrowUp'));
    expect(accordion.getSnapshot().focusedId).toBe('a');
    expect(document.activeElement).toBe(first);
    accordion.handleTriggerKeyDown('a', keyboard('Enter'));
    expect(accordion.getSnapshot().expandedIds).toEqual(['a']);
    removeA();
    expect(accordion.getSnapshot().focusedId).toBe('c');
    accordion.destroy();

    const multiple = createAccordion({ type: 'multiple' });
    multiple.registerItem({ id: 'x', text: 'X' });
    multiple.registerItem({ id: 'y', text: 'Y' });
    multiple.toggle('x');
    multiple.toggle('y');
    expect(multiple.getSnapshot().expandedIds).toEqual(['x', 'y']);
    multiple.destroy();

    const replacements = createAccordion();
    const sharedTrigger = document.createElement('button');
    const otherTrigger = document.createElement('button');
    document.body.append(sharedTrigger, otherTrigger);
    const stale = replacements.registerItem({ id: 'same', text: 'Old' }, sharedTrigger);
    replacements.registerItem({ id: 'other', text: 'Other' }, otherTrigger);
    replacements.registerItem({ id: 'same', text: 'Current' }, sharedTrigger);
    stale();
    stale();
    replacements.focus('other');
    replacements.focus('same');
    expect(document.activeElement).toBe(sharedTrigger);
    replacements.destroy();
  });
});

describe('Tabs', () => {
  it('supports automatic/manual activation, orientation, RTL, disabled and dynamic tabs', () => {
    const tabs = createTabs({
      id: 'editor',
      activation: 'manual',
      orientation: 'horizontal',
      rtl: true,
    });
    const alpha = document.createElement('button');
    const beta = document.createElement('button');
    document.body.append(alpha, beta);
    const removeAlpha = tabs.registerTab({ id: 'a', text: 'Alpha' }, alpha);
    tabs.registerTab({ id: 'b', text: 'Beta' }, beta);
    tabs.registerTab({ id: 'c', text: 'Disabled', disabled: true });
    expect(tabs.getSnapshot().selectedId).toBe('a');
    const left = keyboard('ArrowLeft');
    tabs.handleKeyDown('a', left);
    expect(tabs.getSnapshot()).toMatchObject({ focusedId: 'b', selectedId: 'a' });
    tabs.handleKeyDown('b', keyboard('Enter'));
    expect(tabs.getSnapshot().selectedId).toBe('b');
    const cancel = tabs.on('beforeSelect', (event) => event.preventDefault());
    tabs.select('a');
    expect(tabs.getSnapshot().selectedId).toBe('b');
    cancel();
    removeAlpha();
    expect(tabs.getSnapshot().items).toHaveLength(2);
    tabs.destroy();

    const vertical = createTabs({ orientation: 'vertical', activation: 'automatic', loop: false });
    vertical.registerTab({ id: 'one', text: 'One' });
    vertical.registerTab({ id: 'two', text: 'Two' });
    vertical.handleKeyDown('one', keyboard('ArrowDown'));
    expect(vertical.getSnapshot().selectedId).toBe('two');
    vertical.handleKeyDown('two', keyboard('End'));
    vertical.destroy();
    const defaults = createTabs();
    const sharedElement = document.createElement('button');
    const otherElement = document.createElement('button');
    document.body.append(sharedElement, otherElement);
    const stale = defaults.registerTab({ id: 'same', text: 'Old' }, sharedElement);
    defaults.registerTab({ id: 'other', text: 'Other' }, otherElement);
    defaults.registerTab({ id: 'same', text: 'New' }, sharedElement);
    stale();
    stale();
    defaults.focus('other');
    defaults.focus('same');
    expect(document.activeElement).toBe(sharedElement);
    defaults.destroy();
  });
});

describe('Listbox and Menu engines', () => {
  it('selects single/multiple listbox values with active descendant and typeahead', () => {
    vi.useFakeTimers();
    const listbox = createListbox({ id: 'cities', selectionMode: 'multiple' });
    const removeRome = listbox.registerOption({ id: 'rome', text: 'Rome', value: 'it' });
    listbox.registerOption({ id: 'paris', text: 'Paris', value: 'fr' });
    listbox.registerOption({ id: 'disabled', text: 'Prague', disabled: true });
    listbox.handleKeyDown(keyboard('p'));
    expect(listbox.getSnapshot().activeId).toBe('paris');
    listbox.handleKeyDown(keyboard('Enter'));
    listbox.select('rome', { reason: 'pointer' });
    expect(listbox.getSnapshot().selectedValues).toEqual(['fr', 'it']);
    listbox.select('paris');
    expect(listbox.getSnapshot().selectedValues).toEqual(['it']);
    listbox.select('disabled');
    listbox.handleKeyDown(keyboard('Home'));
    listbox.handleKeyDown(keyboard('End'));
    vi.advanceTimersByTime(500);
    removeRome();
    expect(listbox.getSnapshot().activeId).toBe('paris');
    listbox.destroy();
  });

  it('keeps rejected controlled Listbox selection authoritative until notification', () => {
    let values: readonly string[] = [];
    let notify: () => void = () => undefined;
    const request = vi.fn<(next: readonly string[]) => void>();
    const listbox = createListbox({
      getValue: () => values,
      onValueChange: request,
      subscribeValue(listener) {
        notify = listener;
        return () => undefined;
      },
    });
    listbox.registerOption({ id: 'alpha', text: 'Alpha', value: 'a' });
    const selected = vi.fn();
    listbox.on('select', selected);
    listbox.select('alpha', { reason: 'keyboard' });
    expect(listbox.getSnapshot().selectedValues).toEqual([]);
    expect(selected).not.toHaveBeenCalled();
    values = request.mock.calls[0]?.[0] ?? [];
    notify();
    expect(listbox.getSnapshot().selectedValues).toEqual(['a']);
    expect(selected).toHaveBeenCalledOnce();
    listbox.destroy();
  });

  it('does not attribute a later external Listbox value to a superseded request', () => {
    let values: readonly string[] = [];
    let notify: () => void = () => undefined;
    const request = vi.fn<(next: readonly string[]) => void>();
    const listbox = createListbox({
      getValue: () => values,
      onValueChange: request,
      subscribeValue(listener) {
        notify = listener;
        return () => undefined;
      },
    });
    listbox.registerOption({ id: 'alpha', text: 'Alpha', value: 'a' });
    listbox.registerOption({ id: 'beta', text: 'Beta', value: 'b' });
    const selected = vi.fn();
    listbox.on('select', selected);

    listbox.select('alpha', { reason: 'keyboard' });
    expect(request).toHaveBeenCalledWith(['a'], { reason: 'keyboard' });
    values = ['b'];
    notify();
    values = ['a'];
    notify();

    expect(listbox.getSnapshot().selectedValues).toEqual(['a']);
    expect(selected).not.toHaveBeenCalled();
    listbox.destroy();
  });

  it('rejects unknown active IDs and initializes controlled-open Menu focus', () => {
    const listbox = createListbox();
    const removeOption = listbox.registerOption({ id: 'alpha', text: 'Alpha' });
    listbox.registerOption({ id: 'beta', text: 'Beta' });
    listbox.setActive('missing');
    expect(listbox.getSnapshot().activeId).toBe('alpha');
    listbox.registerOption({ id: 'alpha', text: 'Unavailable Alpha', disabled: true });
    expect(listbox.getSnapshot().activeId).toBe('beta');
    removeOption();
    removeOption();
    expect(listbox.getSnapshot().options.find((option) => option.id === 'alpha')).toMatchObject({
      text: 'Unavailable Alpha',
      disabled: true,
    });
    listbox.destroy();

    const first = document.createElement('button');
    const second = document.createElement('button');
    document.body.append(first, second);
    const controlled = createMenu({ id: 'controlled-menu', getValue: () => true });
    const removeFirst = controlled.registerItem({ id: 'first', text: 'First' }, first);
    controlled.registerItem({ id: 'second', text: 'Second' }, second);
    expect(controlled.getSnapshot()).toMatchObject({
      contentId: 'controlled-menu',
      open: true,
      activeId: 'first',
    });
    expect(document.activeElement).toBe(first);
    controlled.setActive('missing');
    expect(controlled.getSnapshot().activeId).toBe('first');
    removeFirst();
    removeFirst();
    expect(controlled.getSnapshot().activeId).toBe('second');
    expect(document.activeElement).toBe(second);
    const shared = document.createElement('button');
    document.body.append(shared);
    const staleShared = controlled.registerItem({ id: 'shared', text: 'Old' }, shared);
    controlled.registerItem({ id: 'shared', text: 'Current' }, shared);
    staleShared();
    controlled.setActive('shared');
    expect(controlled.getSnapshot().items.find((item) => item.id === 'shared')?.text).toBe(
      'Current',
    );
    expect(document.activeElement).toBe(shared);
    controlled.destroy();

    const direct = createMenu();
    direct.registerItem({ id: 'action', text: 'Action' });
    direct.open();
    const escape = keyboard('Escape');
    direct.handleKeyDown(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(direct.getSnapshot().open).toBe(false);
    direct.open();
    const tab = keyboard('Tab', { shiftKey: true });
    direct.handleKeyDown(tab);
    expect(tab.defaultPrevented).toBe(false);
    expect(direct.getSnapshot().open).toBe(false);
    direct.destroy();

    const controlledOpen = true;
    const requestControlledClose = vi.fn();
    const pending = createMenu({
      getValue: () => controlledOpen,
      onValueChange: requestControlledClose,
    });
    const pendingEscape = keyboard('Escape');
    pending.handleKeyDown(pendingEscape);
    expect(pendingEscape.defaultPrevented).toBe(true);
    expect(requestControlledClose).toHaveBeenCalledWith(false, {
      reason: 'escape-key',
      event: pendingEscape,
    });
    expect(pending.getSnapshot().open).toBe(true);
    pending.destroy();

    const vetoed = createMenu({ defaultValue: true });
    vetoed.on('beforeClose', (event) => event.preventDefault());
    const vetoedEscape = keyboard('Escape');
    vetoed.handleKeyDown(vetoedEscape);
    expect(vetoedEscape.defaultPrevented).toBe(true);
    expect(vetoed.getSnapshot().open).toBe(true);
    vetoed.destroy();

    const parent = createMenu();
    parent.registerItem({ id: 'nested', text: 'Nested', submenuId: 'nested-menu' });
    const child = createMenu();
    child.registerItem({ id: 'child-action', text: 'Child action' });
    parent.registerSubmenu('nested', child);
    parent.destroy();
    child.open();
    child.close();
    expect(child.getSnapshot().open).toBe(false);
    child.destroy();
  });

  it('shares item navigation, separators, submenus, lifecycle, and wrappers', () => {
    vi.useFakeTimers();
    const menu = createMenu({ closeOnSelect: false });
    const parentItem = document.createElement('button');
    const childItem = document.createElement('button');
    document.body.append(parentItem, childItem);
    menu.registerItem({ id: 'new', text: 'New', submenuId: 'new-sub' }, parentItem);
    const submenu = createMenu();
    submenu.registerItem({ id: 'child', text: 'Child' }, childItem);
    menu.registerSubmenu('new', submenu);
    menu.registerItem({ id: 'separator', text: '', kind: 'separator' });
    menu.registerItem({ id: 'disabled', text: 'Disabled', disabled: true });
    const removeOpen = menu.registerItem({ id: 'open', text: 'Open' });
    menu.open();
    expect(menu.getSnapshot().activeId).toBe('new');
    menu.handleKeyDown(keyboard('ArrowDown'));
    expect(menu.getSnapshot().activeId).toBe('open');
    menu.handleKeyDown(keyboard('Home'));
    menu.handleKeyDown(keyboard('ArrowRight'));
    expect(menu.getSnapshot().openSubmenuId).toBe('new-sub');
    expect(submenu.getSnapshot().open).toBe(true);
    expect(document.activeElement).toBe(childItem);
    submenu.handleKeyDown(keyboard('ArrowLeft'));
    expect(submenu.getSnapshot().open).toBe(false);
    expect(document.activeElement).toBe(parentItem);
    menu.handleKeyDown(keyboard('o'));
    expect(menu.getSnapshot().activeId).toBe('open');
    menu.handleKeyDown(keyboard(' '));
    expect(menu.getSnapshot().selectedId).toBe('open');
    const cancel = menu.on('beforeSelect', (event) => event.preventDefault());
    menu.select('new');
    expect(menu.getSnapshot().selectedId).toBe('open');
    cancel();
    vi.advanceTimersByTime(500);
    removeOpen();
    menu.destroy();
    submenu.destroy();

    const dropdown = createDropdownMenu();
    dropdown.registerItem({ id: 'a', text: 'A' });
    const click = new MouseEvent('click', { cancelable: true });
    dropdown.handleTrigger(click);
    expect(dropdown.getSnapshot().open).toBe(true);
    dropdown.handleTrigger(keyboard('x'));
    dropdown.handleTrigger(keyboard('ArrowDown'));
    dropdown.destroy();

    const context = createContextMenu();
    context.registerItem({ id: 'copy', text: 'Copy' });
    const trigger = document.createElement('button');
    const content = document.createElement('div');
    document.body.append(trigger, content);
    const event = new MouseEvent('contextmenu', { clientX: 4, clientY: 8, cancelable: true });
    Object.defineProperty(event, 'currentTarget', { value: trigger });
    let openReason: string | undefined;
    context.on('beforeOpen', (openEvent) => {
      openReason = openEvent.detail.details.reason;
    });
    const unbind = context.handleContextMenu(event, content);
    expect(event.defaultPrevented).toBe(true);
    expect(context.getSnapshot().open).toBe(true);
    expect(openReason).toBe('context-menu');
    unbind();
    context.close();
    context.handleKeyboardOpen(keyboard('x'), trigger, content);
    const keyboardEvent = keyboard('F10', { shiftKey: true });
    context.handleKeyboardOpen(keyboardEvent, trigger, content)();
    expect(keyboardEvent.defaultPrevented).toBe(true);
    expect(openReason).toBe('keyboard');
    context.destroy();

    const cancelled = createContextMenu();
    cancelled.on('beforeOpen', (openEvent) => openEvent.preventDefault());
    const nativeEvent = new MouseEvent('contextmenu', { cancelable: true });
    Object.defineProperty(nativeEvent, 'currentTarget', { value: trigger });
    cancelled.handleContextMenu(nativeEvent, content)();
    expect(nativeEvent.defaultPrevented).toBe(false);
    expect(cancelled.getSnapshot().open).toBe(false);
    cancelled.destroy();
  });

  it('keeps submenu state coherent when close or replacement is cancelled', () => {
    const menu = createMenu({ closeOnSelect: false });
    const firstTrigger = document.createElement('button');
    const secondTrigger = document.createElement('button');
    document.body.append(firstTrigger, secondTrigger);
    menu.registerItem({ id: 'a', text: 'A', submenuId: 'submenu-a' }, firstTrigger);
    menu.registerItem({ id: 'b', text: 'B', submenuId: 'submenu-b' }, secondTrigger);
    menu.registerItem({ id: 'leaf', text: 'Leaf' });
    const first = createMenu();
    const second = createMenu();
    first.registerItem({ id: 'a-child', text: 'A child' });
    second.registerItem({ id: 'b-child', text: 'B child' });
    const stale = menu.registerSubmenu('a', first);
    menu.registerSubmenu('b', second);
    menu.open();
    menu.setActive('a');
    menu.select('a');
    expect(menu.getSnapshot().openSubmenuId).toBe('submenu-a');
    expect(menu.getSnapshot().activeId).toBe('a');
    const cancel = first.on('beforeClose', (event) => event.preventDefault());
    menu.select('b');
    expect(first.getSnapshot().open).toBe(true);
    expect(second.getSnapshot().open).toBe(false);
    expect(menu.getSnapshot().openSubmenuId).toBe('submenu-a');
    expect(menu.getSnapshot().activeId).toBe('a');
    expect(document.activeElement).toBe(firstTrigger);
    menu.handleKeyDown(keyboard('ArrowLeft'));
    expect(menu.getSnapshot().openSubmenuId).toBe('submenu-a');
    cancel();
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    first.close();
    expect(document.activeElement).toBe(outside);
    expect(menu.getSnapshot().openSubmenuId).toBeNull();

    menu.select('a');
    const cancelAgain = first.on('beforeClose', (event) => event.preventDefault());
    menu.select('leaf');
    expect(menu.getSnapshot()).toMatchObject({
      open: true,
      openSubmenuId: 'submenu-a',
      selectedId: null,
    });
    expect(first.getSnapshot().open).toBe(true);
    menu.close();
    expect(menu.getSnapshot().open).toBe(true);
    expect(first.getSnapshot().open).toBe(true);
    expect(menu.registerSubmenu('a', first)()).toBeUndefined();
    cancelAgain();
    menu.registerSubmenu('a', first);
    menu.select('a');
    stale();
    expect(menu.getSnapshot().openSubmenuId).toBe('submenu-a');
    menu.select('b');
    expect(first.getSnapshot().open).toBe(false);
    expect(second.getSnapshot().open).toBe(true);
    expect(menu.getSnapshot().openSubmenuId).toBe('submenu-b');
    menu.destroy();
    first.destroy();
    second.destroy();
  });

  it('restores parent Menu focus after a controlled submenu commits an async close', () => {
    let open = true;
    let notify: () => void = () => undefined;
    const parentElement = document.createElement('button');
    document.body.append(parentElement);
    const parent = createMenu({ closeOnSelect: false });
    parent.registerItem(
      { id: 'nested', text: 'Nested', submenuId: 'controlled-child' },
      parentElement,
    );
    const child = createMenu({
      getValue: () => open,
      onValueChange: vi.fn(),
      subscribeValue(listener) {
        notify = listener;
        return () => undefined;
      },
    });
    child.registerItem({ id: 'child', text: 'Child' });
    parent.registerSubmenu('nested', child);
    parent.open();
    parent.select('nested');
    child.handleKeyDown(keyboard('ArrowLeft'));
    expect(child.getSnapshot().open).toBe(true);
    expect(parent.getSnapshot().openSubmenuId).toBe('controlled-child');
    open = false;
    notify();
    expect(parent.getSnapshot().openSubmenuId).toBeNull();
    expect(document.activeElement).toBe(parentElement);
    parent.destroy();
    child.destroy();
  });

  it('does not apply a stale submenu focus restore after another controlled close request', () => {
    let open = true;
    let notify: () => void = () => undefined;
    const parentElement = document.createElement('button');
    const outside = document.createElement('button');
    document.body.append(parentElement, outside);
    const parent = createMenu({ closeOnSelect: false });
    parent.registerItem(
      { id: 'nested', text: 'Nested', submenuId: 'controlled-child' },
      parentElement,
    );
    const child = createMenu({
      getValue: () => open,
      onValueChange: vi.fn(),
      subscribeValue(listener) {
        notify = listener;
        return () => undefined;
      },
    });
    child.registerItem({ id: 'child', text: 'Child' });
    parent.registerSubmenu('nested', child);
    parent.open();
    parent.select('nested');

    child.handleKeyDown(keyboard('ArrowLeft'));
    expect(parent.getSnapshot().openSubmenuId).toBe('controlled-child');
    child.close({ reason: 'programmatic' });
    outside.focus();
    open = false;
    notify();

    expect(parent.getSnapshot().openSubmenuId).toBeNull();
    expect(document.activeElement).toBe(outside);
    parent.destroy();
    child.destroy();
  });

  it('does not restore focus to a parent item disabled during an async submenu close', () => {
    let open = true;
    let notify: () => void = () => undefined;
    const trigger = document.createElement('button');
    const outside = document.createElement('button');
    document.body.append(trigger, outside);
    const parent = createMenu({ closeOnSelect: false });
    parent.registerItem({ id: 'nested', text: 'Nested', submenuId: 'child' }, trigger);
    const child = createMenu({
      getValue: () => open,
      onValueChange: vi.fn(),
      subscribeValue(listener) {
        notify = listener;
        return () => undefined;
      },
    });
    child.registerItem({ id: 'action', text: 'Action' });
    parent.registerSubmenu('nested', child);
    parent.open();
    parent.select('nested');
    child.handleKeyDown(keyboard('ArrowLeft'));
    parent.registerItem({ id: 'nested', text: 'Unavailable', submenuId: 'child', disabled: true });
    outside.focus();
    open = false;
    notify();

    expect(parent.getSnapshot().items.find((item) => item.id === 'nested')?.disabled).toBe(true);
    expect(document.activeElement).toBe(outside);
    parent.destroy();
    child.destroy();
  });

  it('releases temporary submenu cancellation observers and pending focus after close throws', () => {
    const parentElement = document.createElement('button');
    const outside = document.createElement('button');
    document.body.append(parentElement, outside);
    const parent = createMenu({ closeOnSelect: false });
    parent.registerItem({ id: 'nested', text: 'Nested', submenuId: 'child' }, parentElement);
    const child = createMenu();
    child.registerItem({ id: 'action', text: 'Action' });
    parent.registerSubmenu('nested', child);
    parent.open();
    parent.select('nested');
    const releaseThrow = child.on('beforeClose', () => {
      throw new Error('consumer close failure');
    });

    expect(() => child.handleKeyDown(keyboard('ArrowLeft'))).toThrow('consumer close failure');
    releaseThrow();
    outside.focus();
    child.close();

    expect(parent.getSnapshot().openSubmenuId).toBeNull();
    expect(document.activeElement).toBe(outside);
    parent.destroy();
    child.destroy();
  });

  it('commits controlled submenu open, switch, and leaf-selection intents exactly once', () => {
    let firstOpen = true;
    let notifyFirst: () => void = () => undefined;
    const parent = createMenu({ closeOnSelect: false });
    const firstTrigger = document.createElement('button');
    const secondTrigger = document.createElement('button');
    const leafTrigger = document.createElement('button');
    const firstChildElement = document.createElement('button');
    const secondChildElement = document.createElement('button');
    document.body.append(
      firstTrigger,
      secondTrigger,
      leafTrigger,
      firstChildElement,
      secondChildElement,
    );
    parent.registerItem({ id: 'first', text: 'First', submenuId: 'first-child' }, firstTrigger);
    parent.registerItem({ id: 'second', text: 'Second', submenuId: 'second-child' }, secondTrigger);
    parent.registerItem({ id: 'leaf', text: 'Leaf' }, leafTrigger);
    const first = createMenu({
      getValue: () => firstOpen,
      onValueChange: vi.fn(),
      subscribeValue(listener) {
        notifyFirst = listener;
        return () => undefined;
      },
    });
    first.registerItem({ id: 'first-action', text: 'First action' }, firstChildElement);
    const second = createMenu();
    second.registerItem({ id: 'second-action', text: 'Second action' }, secondChildElement);
    parent.registerSubmenu('first', first);
    parent.registerSubmenu('second', second);
    parent.open();
    parent.select('first');
    parent.setActive('first');
    expect(parent.getSnapshot().openSubmenuId).toBe('first-child');

    parent.select('second', { reason: 'keyboard', event: keyboard('ArrowRight') });
    expect(parent.getSnapshot()).toMatchObject({ openSubmenuId: 'first-child', activeId: 'first' });
    expect(second.getSnapshot().open).toBe(false);
    expect(document.activeElement).toBe(firstTrigger);
    firstOpen = false;
    notifyFirst();
    expect(parent.getSnapshot()).toMatchObject({
      openSubmenuId: 'second-child',
      activeId: 'second',
    });
    expect(second.getSnapshot().open).toBe(true);
    expect(document.activeElement).toBe(secondChildElement);

    let controlledSecondOpen = false;
    let notifySecond: () => void = () => undefined;
    const asyncParent = createMenu({ closeOnSelect: false });
    const asyncTrigger = document.createElement('button');
    const asyncChildElement = document.createElement('button');
    document.body.append(asyncTrigger, asyncChildElement);
    asyncParent.registerItem(
      { id: 'async', text: 'Async', submenuId: 'async-child' },
      asyncTrigger,
    );
    const asyncChild = createMenu({
      getValue: () => controlledSecondOpen,
      onValueChange: vi.fn(),
      subscribeValue(listener) {
        notifySecond = listener;
        return () => undefined;
      },
    });
    asyncChild.registerItem({ id: 'async-action', text: 'Async action' }, asyncChildElement);
    asyncParent.registerSubmenu('async', asyncChild);
    asyncParent.open();
    asyncParent.select('async');
    expect(asyncParent.getSnapshot().openSubmenuId).toBeNull();
    expect(document.activeElement).not.toBe(asyncChildElement);
    controlledSecondOpen = true;
    notifySecond();
    expect(asyncParent.getSnapshot()).toMatchObject({
      openSubmenuId: 'async-child',
      activeId: 'async',
    });
    expect(document.activeElement).toBe(asyncChildElement);

    let selectionChildOpen = true;
    let notifySelectionChild: () => void = () => undefined;
    const selectionCloseRequest = vi.fn();
    const selectionParent = createMenu({ closeOnSelect: false });
    selectionParent.registerItem({ id: 'nested', text: 'Nested', submenuId: 'selection-child' });
    selectionParent.registerItem({ id: 'leaf', text: 'Leaf' });
    const selectionChild = createMenu({
      getValue: () => selectionChildOpen,
      onValueChange: selectionCloseRequest,
      subscribeValue(listener) {
        notifySelectionChild = listener;
        return () => undefined;
      },
    });
    selectionChild.registerItem({ id: 'child-action', text: 'Child action' });
    selectionParent.registerSubmenu('nested', selectionChild);
    selectionParent.open();
    selectionParent.select('nested');
    const beforeSelect = vi.fn();
    const selected = vi.fn();
    selectionParent.on('beforeSelect', beforeSelect);
    selectionParent.on('select', selected);
    const cancelSelection = selectionParent.on('beforeSelect', (event) => event.preventDefault());
    selectionParent.select('leaf', { reason: 'pointer' });
    expect(selectionChild.getSnapshot().open).toBe(true);
    expect(selectionCloseRequest).not.toHaveBeenCalled();
    expect(selected).not.toHaveBeenCalled();
    cancelSelection();
    selectionParent.select('leaf', { reason: 'pointer' });
    expect(beforeSelect).toHaveBeenCalledTimes(2);
    expect(selected).not.toHaveBeenCalled();
    expect(selectionParent.getSnapshot().selectedId).toBeNull();
    selectionChildOpen = false;
    notifySelectionChild();
    expect(beforeSelect).toHaveBeenCalledTimes(2);
    expect(selected).toHaveBeenCalledOnce();
    expect(selectionParent.getSnapshot().selectedId).toBe('leaf');

    parent.destroy();
    first.destroy();
    second.destroy();
    asyncParent.destroy();
    asyncChild.destroy();
    selectionParent.destroy();
    selectionChild.destroy();
  });

  it('does not open a stale switch target after its item or submenu registration is replaced', () => {
    const createSwitchCase = () => {
      let firstOpen = true;
      let notifyFirst: () => void = () => undefined;
      const parent = createMenu({ closeOnSelect: false });
      const removeFirstItem = parent.registerItem({
        id: 'first',
        text: 'First',
        submenuId: 'first-child',
      });
      const removeSecondItem = parent.registerItem({
        id: 'second',
        text: 'Second',
        submenuId: 'second-child',
      });
      const first = createMenu({
        getValue: () => firstOpen,
        onValueChange: vi.fn(),
        subscribeValue(listener) {
          notifyFirst = listener;
          return () => undefined;
        },
      });
      const second = createMenu();
      first.registerItem({ id: 'action', text: 'Action' });
      second.registerItem({ id: 'action', text: 'Action' });
      parent.registerSubmenu('first', first);
      const removeSecondSubmenu = parent.registerSubmenu('second', second);
      parent.open();
      parent.select('first');
      parent.select('second');
      return {
        parent,
        first,
        second,
        removeFirstItem,
        removeSecondItem,
        removeSecondSubmenu,
        commitFirstClose() {
          firstOpen = false;
          notifyFirst();
        },
      };
    };

    const releasedRegistration = createSwitchCase();
    releasedRegistration.removeSecondSubmenu();
    releasedRegistration.commitFirstClose();
    expect(releasedRegistration.second.getSnapshot().open).toBe(false);
    expect(releasedRegistration.parent.getSnapshot().openSubmenuId).toBeNull();
    releasedRegistration.parent.destroy();
    releasedRegistration.first.destroy();
    releasedRegistration.second.destroy();

    const replacedItem = createSwitchCase();
    const removeReplacement = replacedItem.parent.registerItem({
      id: 'second',
      text: 'Replacement',
      submenuId: 'second-child',
    });
    replacedItem.commitFirstClose();
    expect(replacedItem.second.getSnapshot().open).toBe(false);
    expect(replacedItem.parent.getSnapshot().openSubmenuId).toBeNull();
    removeReplacement();
    replacedItem.parent.destroy();
    replacedItem.first.destroy();
    replacedItem.second.destroy();
  });

  it('cancels superseded controlled submenu open and leaf-selection intents', () => {
    let firstOpen = false;
    let notifyFirst: () => void = () => undefined;
    const firstRequest = vi.fn((value: boolean) => {
      if (!value) firstOpen = false;
    });
    let secondOpen = false;
    let notifySecond: () => void = () => undefined;
    const parent = createMenu({ closeOnSelect: false });
    parent.registerItem({ id: 'first', text: 'First', submenuId: 'first-child' });
    parent.registerItem({ id: 'second', text: 'Second', submenuId: 'second-child' });
    const first = createMenu({
      getValue: () => firstOpen,
      onValueChange: firstRequest,
      subscribeValue(listener) {
        notifyFirst = listener;
        return () => undefined;
      },
    });
    const second = createMenu({
      getValue: () => secondOpen,
      onValueChange: vi.fn(),
      subscribeValue(listener) {
        notifySecond = listener;
        return () => undefined;
      },
    });
    first.registerItem({ id: 'action', text: 'Action' });
    second.registerItem({ id: 'action', text: 'Action' });
    parent.registerSubmenu('first', first);
    parent.registerSubmenu('second', second);
    parent.open();
    parent.select('first');
    parent.select('second');
    firstOpen = true;
    notifyFirst();
    expect(firstRequest).toHaveBeenLastCalledWith(false, { reason: 'programmatic' });
    expect(first.getSnapshot().open).toBe(false);
    expect(parent.getSnapshot().openSubmenuId).toBeNull();
    secondOpen = true;
    notifySecond();
    expect(parent.getSnapshot().openSubmenuId).toBe('second-child');

    let selectionChildOpen = true;
    let notifySelectionChild: () => void = () => undefined;
    const selectionParent = createMenu({ closeOnSelect: false });
    selectionParent.registerItem({ id: 'nested', text: 'Nested', submenuId: 'child' });
    selectionParent.registerItem({ id: 'first-leaf', text: 'First leaf' });
    selectionParent.registerItem({ id: 'second-leaf', text: 'Second leaf' });
    const selectionChild = createMenu({
      getValue: () => selectionChildOpen,
      onValueChange: vi.fn(),
      subscribeValue(listener) {
        notifySelectionChild = listener;
        return () => undefined;
      },
    });
    selectionChild.registerItem({ id: 'action', text: 'Action' });
    selectionParent.registerSubmenu('nested', selectionChild);
    selectionParent.open();
    selectionParent.select('nested');
    const selectedIds: string[] = [];
    selectionParent.on('select', (event) => selectedIds.push(event.detail.item.id));
    selectionParent.select('first-leaf');
    selectionParent.select('second-leaf');
    selectionChildOpen = false;
    notifySelectionChild();
    expect(selectionParent.getSnapshot().selectedId).toBe('second-leaf');
    expect(selectedIds).toEqual(['second-leaf']);

    parent.destroy();
    first.destroy();
    second.destroy();
    selectionParent.destroy();
    selectionChild.destroy();
  });

  it('applies structural replacements and releases submenu ownership despite a close veto', () => {
    const trigger = document.createElement('button');
    const outside = document.createElement('button');
    document.body.append(trigger, outside);
    const parent = createMenu({ closeOnSelect: false });
    const removeItem = parent.registerItem(
      { id: 'nested', text: 'Nested', submenuId: 'child' },
      trigger,
    );
    const child = createMenu();
    child.registerItem({ id: 'action', text: 'Action' });
    const removeSubmenu = parent.registerSubmenu('nested', child);
    parent.open();
    parent.select('nested');
    const cancelClose = child.on('beforeClose', (event) => event.preventDefault());

    const removeReplacement = parent.registerItem({
      id: 'nested',
      text: 'Disabled replacement',
      submenuId: 'child',
      disabled: true,
    });
    expect(child.getSnapshot().open).toBe(true);
    expect(parent.getSnapshot()).toMatchObject({ openSubmenuId: null, activeId: null });
    expect(parent.getSnapshot().items.find((item) => item.id === 'nested')).toMatchObject({
      text: 'Disabled replacement',
      disabled: true,
    });

    removeItem();
    removeSubmenu();
    removeItem();
    removeSubmenu();
    expect(child.getSnapshot().open).toBe(true);
    expect(parent.getSnapshot().items).toHaveLength(1);

    cancelClose();
    outside.focus();
    child.handleKeyDown(keyboard('ArrowLeft'));
    expect(child.getSnapshot().open).toBe(true);
    expect(document.activeElement).toBe(outside);
    child.close();
    expect(child.getSnapshot().open).toBe(false);

    removeReplacement();
    expect(parent.getSnapshot().items).toHaveLength(0);
    parent.destroy();
    child.destroy();

    const successfulParent = createMenu({ closeOnSelect: false });
    const successfulRemoveItem = successfulParent.registerItem({
      id: 'nested',
      text: 'Nested',
      submenuId: 'child',
    });
    const successfulChild = createMenu();
    successfulChild.registerItem({ id: 'action', text: 'Action' });
    const successfulRemoveSubmenu = successfulParent.registerSubmenu('nested', successfulChild);
    successfulParent.open();
    successfulParent.select('nested');
    successfulRemoveSubmenu();
    expect(successfulChild.getSnapshot().open).toBe(false);
    expect(successfulParent.getSnapshot().openSubmenuId).toBeNull();
    successfulParent.select('nested');
    expect(successfulChild.getSnapshot().open).toBe(false);
    successfulRemoveItem();
    expect(successfulParent.getSnapshot().items).toHaveLength(0);
    successfulParent.destroy();
    successfulChild.destroy();

    const unregisterParent = createMenu({ closeOnSelect: false });
    const unregisterItem = unregisterParent.registerItem({
      id: 'nested',
      text: 'Nested',
      submenuId: 'child',
    });
    const unregisterChild = createMenu();
    unregisterChild.registerItem({ id: 'action', text: 'Action' });
    unregisterParent.registerSubmenu('nested', unregisterChild);
    unregisterParent.open();
    unregisterParent.select('nested');
    unregisterItem();
    expect(unregisterChild.getSnapshot().open).toBe(false);
    expect(unregisterParent.getSnapshot()).toMatchObject({ openSubmenuId: null, items: [] });
    unregisterParent.destroy();
    unregisterChild.destroy();
  });

  it('keeps the newest structural item and submenu registration during reentrant replacement', () => {
    const itemParent = createMenu({ closeOnSelect: false });
    itemParent.registerItem({ id: 'nested', text: 'Original', submenuId: 'child' });
    const itemChild = createMenu();
    itemChild.registerItem({ id: 'action', text: 'Action' });
    itemParent.registerSubmenu('nested', itemChild);
    itemParent.open();
    itemParent.select('nested');
    let removeNewestItem: () => void = () => undefined;
    itemChild.once('beforeClose', () => {
      removeNewestItem = itemParent.registerItem({ id: 'nested', text: 'Newest' });
    });

    const removeStaleItem = itemParent.registerItem({
      id: 'nested',
      text: 'Stale outer replacement',
      submenuId: 'child',
      disabled: true,
    });

    expect(itemParent.getSnapshot().items).toEqual([
      expect.objectContaining({ id: 'nested', text: 'Newest', disabled: false }),
    ]);
    removeStaleItem();
    expect(itemParent.getSnapshot().items).toHaveLength(1);
    removeNewestItem();
    expect(itemParent.getSnapshot().items).toHaveLength(0);
    itemParent.destroy();
    itemChild.destroy();

    const submenuParent = createMenu({ closeOnSelect: false });
    submenuParent.registerItem({ id: 'nested', text: 'Nested', submenuId: 'child' });
    const original = createMenu();
    const staleOuter = createMenu();
    const newest = createMenu();
    for (const submenu of [original, staleOuter, newest])
      submenu.registerItem({ id: 'action', text: 'Action' });
    submenuParent.registerSubmenu('nested', original);
    submenuParent.open();
    submenuParent.select('nested');
    let releaseNewest: () => void = () => undefined;
    original.once('beforeClose', () => {
      releaseNewest = submenuParent.registerSubmenu('nested', newest);
    });

    const releaseStaleOuter = submenuParent.registerSubmenu('nested', staleOuter);
    submenuParent.select('nested');

    expect(newest.getSnapshot().open).toBe(true);
    expect(staleOuter.getSnapshot().open).toBe(false);
    releaseStaleOuter();
    expect(newest.getSnapshot().open).toBe(true);
    releaseNewest();
    submenuParent.destroy();
    original.destroy();
    staleOuter.destroy();
    newest.destroy();
  });

  it('ignores already handled nested Menu keyboard events at ancestor levels', () => {
    const root = createMenu({ closeOnSelect: false });
    const middle = createMenu({ closeOnSelect: false });
    const leaf = createMenu({ closeOnSelect: false });
    root.registerItem({ id: 'middle', text: 'Middle', submenuId: 'middle-menu' });
    root.registerItem({ id: 'root-leaf', text: 'Root leaf' });
    middle.registerItem({ id: 'leaf', text: 'Leaf', submenuId: 'leaf-menu' });
    middle.registerItem({ id: 'middle-leaf', text: 'Middle leaf' });
    leaf.registerItem({ id: 'action', text: 'Action' });
    root.registerSubmenu('middle', middle);
    middle.registerSubmenu('leaf', leaf);
    const rootContent = document.createElement('div');
    const middleContent = document.createElement('div');
    const leafContent = document.createElement('div');
    rootContent.append(middleContent);
    middleContent.append(leafContent);
    document.body.append(rootContent);
    rootContent.addEventListener('keydown', root.handleKeyDown);
    middleContent.addEventListener('keydown', middle.handleKeyDown);
    leafContent.addEventListener('keydown', leaf.handleKeyDown);
    root.open();
    root.select('middle');
    middle.select('leaf');

    const left = keyboard('ArrowLeft');
    leafContent.dispatchEvent(left);
    expect(left.defaultPrevented).toBe(true);
    expect(leaf.getSnapshot().open).toBe(false);
    expect(middle.getSnapshot().open).toBe(true);
    expect(root.getSnapshot().open).toBe(true);

    middle.select('leaf');
    const escape = keyboard('Escape');
    leafContent.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(leaf.getSnapshot().open).toBe(false);
    expect(middle.getSnapshot().open).toBe(true);
    expect(root.getSnapshot().open).toBe(true);

    middle.select('leaf');
    root.setActive('root-leaf');
    middle.setActive('middle-leaf');
    leaf.setActive('action');
    const enter = keyboard('Enter');
    leafContent.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);
    expect(leaf.getSnapshot().selectedId).toBe('action');
    expect(middle.getSnapshot().selectedId).toBeNull();
    expect(root.getSnapshot().selectedId).toBeNull();

    root.destroy();
    middle.destroy();
    leaf.destroy();
  });

  it('propagates a nested close veto before classifying a controlled parent close', async () => {
    const root = createMenu({ closeOnSelect: false });
    let middleOpen = true;
    let notifyMiddle: () => void = () => undefined;
    const requestMiddle = vi.fn();
    const middle = createMenu({
      getValue: () => middleOpen,
      onValueChange: requestMiddle,
      subscribeValue(listener) {
        notifyMiddle = listener;
        return () => undefined;
      },
      closeOnSelect: false,
    });
    const leaf = createMenu({ closeOnSelect: false });
    root.registerItem({ id: 'middle', text: 'Middle', submenuId: 'middle-menu' });
    middle.registerItem({ id: 'leaf', text: 'Leaf', submenuId: 'leaf-menu' });
    leaf.registerItem({ id: 'action', text: 'Action' });
    root.registerSubmenu('middle', middle);
    middle.registerSubmenu('leaf', leaf);
    root.open();
    root.select('middle');
    middle.select('leaf');
    const cancelLeafClose = leaf.on('beforeClose', (event) => event.preventDefault());

    root.handleKeyDown(keyboard('ArrowLeft'));
    expect(requestMiddle).not.toHaveBeenCalled();
    expect(leaf.getSnapshot().open).toBe(true);
    expect(middle.getSnapshot().open).toBe(true);
    expect(root.getSnapshot().openSubmenuId).toBe('middle-menu');

    cancelLeafClose();
    root.handleKeyDown(keyboard('ArrowLeft'));
    expect(leaf.getSnapshot().open).toBe(false);
    expect(requestMiddle).toHaveBeenCalledOnce();
    await Promise.resolve();
    expect(requestMiddle).toHaveBeenCalledOnce();
    middleOpen = false;
    notifyMiddle();
    expect(root.getSnapshot().openSubmenuId).toBeNull();
    root.destroy();
    middle.destroy();
    leaf.destroy();
  });

  it('preserves an open child when a consumer vetoes its parent close', () => {
    const parent = createMenu({ closeOnSelect: false });
    const child = createMenu({ closeOnSelect: false });
    parent.registerItem({ id: 'nested', text: 'Nested', submenuId: 'child' });
    child.registerItem({ id: 'action', text: 'Action' });
    parent.registerSubmenu('nested', child);
    parent.open();
    parent.select('nested');
    const cancelParentClose = parent.on('beforeClose', (event) => event.preventDefault());

    parent.close();

    expect(parent.getSnapshot().open).toBe(true);
    expect(parent.getSnapshot().openSubmenuId).toBe('child');
    expect(child.getSnapshot().open).toBe(true);
    cancelParentClose();
    parent.close();
    expect(parent.getSnapshot().open).toBe(false);
    expect(child.getSnapshot().open).toBe(false);
    parent.destroy();
    child.destroy();
  });

  it('closes child ownership when a controlled parent closes externally', () => {
    let open = true;
    let notify: () => void = () => undefined;
    const trigger = document.createElement('button');
    const outside = document.createElement('button');
    document.body.append(trigger, outside);
    const parent = createMenu({
      getValue: () => open,
      onValueChange: vi.fn(),
      subscribeValue(listener) {
        notify = listener;
        return () => undefined;
      },
      closeOnSelect: false,
    });
    parent.registerItem({ id: 'nested', text: 'Nested', submenuId: 'child' }, trigger);
    let childOpen = false;
    let notifyChild: () => void = () => undefined;
    const requestChild = vi.fn();
    const child = createMenu({
      getValue: () => childOpen,
      onValueChange: requestChild,
      subscribeValue(listener) {
        notifyChild = listener;
        return () => undefined;
      },
    });
    child.registerItem({ id: 'action', text: 'Action' });
    parent.registerSubmenu('nested', child);
    parent.select('nested');
    expect(requestChild).toHaveBeenLastCalledWith(true, expect.any(Object));
    childOpen = true;
    notifyChild();
    expect(child.getSnapshot()).toMatchObject({ open: true, controlled: true });
    open = false;
    notify();
    expect(parent.getSnapshot()).toMatchObject({ open: false, openSubmenuId: null });
    expect(child.getSnapshot().open).toBe(true);

    outside.focus();
    child.handleKeyDown(keyboard('ArrowLeft'));
    childOpen = false;
    notifyChild();
    expect(child.getSnapshot().open).toBe(false);
    expect(document.activeElement).toBe(outside);
    parent.destroy();
    child.destroy();
  });

  it('reopens a controlled submenu when a newer open intent supersedes its pending close', async () => {
    const parent = createMenu({ closeOnSelect: false });
    parent.registerItem({ id: 'nested', text: 'Nested', submenuId: 'child' });
    let childOpen = false;
    let notifyChild: () => void = () => undefined;
    const requestedValues: boolean[] = [];
    const child = createMenu({
      getValue: () => childOpen,
      onValueChange(value) {
        requestedValues.push(value);
      },
      subscribeValue(listener) {
        notifyChild = listener;
        return () => undefined;
      },
    });
    child.registerItem({ id: 'action', text: 'Action' });
    parent.registerSubmenu('nested', child);
    parent.open();
    parent.select('nested');
    childOpen = true;
    notifyChild();
    expect(parent.getSnapshot().openSubmenuId).toBe('child');

    child.handleKeyDown(keyboard('ArrowLeft'));
    expect(requestedValues).toEqual([true, false]);
    parent.select('nested');
    expect(requestedValues).toEqual([true, false]);

    childOpen = false;
    notifyChild();
    await Promise.resolve();
    expect(requestedValues).toEqual([true, false, true]);
    childOpen = true;
    notifyChild();
    expect(child.getSnapshot().open).toBe(true);
    expect(parent.getSnapshot().openSubmenuId).toBe('child');
    parent.destroy();
    child.destroy();
  });

  it('gives a submenu one parent context at a time and permits transfer after release', () => {
    const firstParent = createMenu({ closeOnSelect: false });
    const secondParent = createMenu({ closeOnSelect: false });
    const firstTrigger = document.createElement('button');
    const secondTrigger = document.createElement('button');
    document.body.append(firstTrigger, secondTrigger);
    firstParent.registerItem({ id: 'nested', text: 'First', submenuId: 'child' }, firstTrigger);
    secondParent.registerItem({ id: 'nested', text: 'Second', submenuId: 'child' }, secondTrigger);
    const child = createMenu();
    child.registerItem({ id: 'action', text: 'Action' });
    const releaseFirst = firstParent.registerSubmenu('nested', child);
    const releaseRejectedSecond = secondParent.registerSubmenu('nested', child);
    firstParent.open();
    firstParent.select('nested');
    expect(child.getSnapshot().open).toBe(true);
    child.handleKeyDown(keyboard('ArrowLeft'));
    expect(document.activeElement).toBe(firstTrigger);
    expect(firstParent.getSnapshot().openSubmenuId).toBeNull();
    expect(secondParent.getSnapshot().openSubmenuId).toBeNull();

    releaseRejectedSecond();
    releaseFirst();
    firstParent.destroy();
    const releaseSecond = secondParent.registerSubmenu('nested', child);
    secondParent.open();
    secondParent.select('nested');
    expect(child.getSnapshot().open).toBe(true);
    child.handleKeyDown(keyboard('ArrowLeft'));
    expect(document.activeElement).toBe(secondTrigger);
    expect(secondParent.getSnapshot().openSubmenuId).toBeNull();
    releaseSecond();
    secondParent.destroy();
    child.destroy();
  });

  it('defers Dropdown ArrowUp last-item focus until a controlled open commits', () => {
    let open = false;
    let notify: () => void = () => undefined;
    const request = vi.fn();
    const outside = document.createElement('button');
    const first = document.createElement('button');
    const last = document.createElement('button');
    document.body.append(outside, first, last);
    outside.focus();
    const dropdown = createDropdownMenu({
      getValue: () => open,
      onValueChange: request,
      subscribeValue(listener) {
        notify = listener;
        return () => undefined;
      },
    });
    dropdown.registerItem({ id: 'first', text: 'First' }, first);
    dropdown.registerItem({ id: 'last', text: 'Last' }, last);
    dropdown.handleTrigger(keyboard('ArrowUp'));
    expect(dropdown.getSnapshot()).toMatchObject({ open: false, activeId: null });
    expect(document.activeElement).toBe(outside);
    open = true;
    notify();
    expect(dropdown.getSnapshot()).toMatchObject({ open: true, activeId: 'last' });
    expect(document.activeElement).toBe(last);
    dropdown.destroy();

    const cancelled = createDropdownMenu();
    cancelled.registerItem({ id: 'first', text: 'First' }, first);
    cancelled.registerItem({ id: 'last', text: 'Last' }, last);
    cancelled.on('beforeOpen', (event) => event.preventDefault());
    outside.focus();
    cancelled.handleTrigger(keyboard('ArrowUp'));
    expect(cancelled.getSnapshot()).toMatchObject({ open: false, activeId: null });
    expect(document.activeElement).toBe(outside);
    cancelled.destroy();
  });

  it('covers menu edge navigation, submenu switching, scoped releases, and destroyed wrappers', () => {
    vi.useFakeTimers();
    const menu = createMenu({ loop: false });
    menu.open();
    menu.handleKeyDown(keyboard('Home'));
    menu.handleKeyDown(keyboard('End'));
    menu.handleKeyDown(keyboard('ArrowDown'));
    menu.toggle();
    menu.toggle();
    menu.setActive(null);
    const orphanSubmenu = createMenu();
    const invalidSubmenu = menu.registerSubmenu('missing', orphanSubmenu);
    invalidSubmenu();
    orphanSubmenu.destroy();

    const firstElement = document.createElement('button');
    const secondElement = document.createElement('button');
    document.body.append(firstElement, secondElement);
    const removeFirst = menu.registerItem(
      { id: 'first', text: 'First', submenuId: 'first-submenu' },
      firstElement,
    );
    menu.registerItem({ id: 'second', text: 'Second', submenuId: 'second-submenu' }, secondElement);
    menu.registerItem({ id: 'disabled', text: 'Disabled', disabled: true });
    menu.registerItem({ id: 'separator', text: '', kind: 'separator' });
    const staleLeafElement = document.createElement('button');
    const leafElement = document.createElement('button');
    const staleLeaf = menu.registerItem({ id: 'leaf', text: 'Old leaf' }, staleLeafElement);
    menu.registerItem({ id: 'leaf', text: 'Leaf' }, leafElement);
    staleLeaf();
    const firstSubmenu = createMenu();
    firstSubmenu.registerItem({ id: 'first-child', text: 'First child' });
    const secondSubmenu = createMenu();
    secondSubmenu.registerItem({ id: 'second-child', text: 'Second child' });
    const releaseFirstSubmenu = menu.registerSubmenu('first', firstSubmenu);
    const releaseSecondSubmenu = menu.registerSubmenu('second', secondSubmenu);

    menu.open();
    menu.setActive('disabled');
    menu.setActive('separator');
    expect(menu.getSnapshot().activeId).toBe('first');
    menu.handleKeyDown(keyboard('End'));
    expect(menu.getSnapshot().activeId).toBe('leaf');
    menu.handleKeyDown(keyboard('ArrowDown'));
    expect(menu.getSnapshot().activeId).toBeNull();
    menu.handleKeyDown(keyboard('ArrowUp'));
    expect(menu.getSnapshot().activeId).toBe('leaf');
    menu.handleKeyDown(keyboard('Home'));
    menu.select('first', { reason: 'pointer' });
    menu.select('second', { reason: 'keyboard', event: keyboard('ArrowRight') });
    expect(firstSubmenu.getSnapshot().open).toBe(false);
    expect(secondSubmenu.getSnapshot().open).toBe(true);
    const beforeSecondClose = vi.fn((event: RuntimeEvent<OpenChangeEvent>) => event);
    secondSubmenu.on('beforeClose', beforeSecondClose);
    const closeSecond = keyboard('ArrowLeft');
    menu.handleKeyDown(closeSecond);
    expect(secondSubmenu.getSnapshot().open).toBe(false);
    expect(beforeSecondClose).toHaveBeenCalledOnce();
    expect(beforeSecondClose.mock.calls[0]?.[0].detail.details).toEqual({
      reason: 'keyboard',
      event: closeSecond,
    });
    menu.setActive('leaf');
    menu.handleKeyDown(keyboard('ArrowRight'));
    const cancelLeaf = menu.on('beforeSelect', (event) => event.preventDefault());
    menu.select('leaf');
    cancelLeaf();
    menu.select('leaf');
    menu.open();
    menu.handleKeyDown(keyboard('x', { altKey: true }));
    menu.setActive(null);
    menu.handleKeyDown(keyboard('Enter'));
    menu.toggle();
    menu.toggle();
    const replacementSubmenu = createMenu();
    const releaseReplacement = menu.registerSubmenu('first', replacementSubmenu);
    releaseFirstSubmenu();
    releaseFirstSubmenu();
    releaseReplacement();
    releaseSecondSubmenu();
    removeFirst();
    removeFirst();
    menu.destroy();
    expect(menu.registerItem({ id: 'late', text: 'Late' })()).toBeUndefined();
    expect(menu.registerSubmenu('first', firstSubmenu)()).toBeUndefined();
    firstSubmenu.destroy();
    secondSubmenu.destroy();
    replacementSubmenu.destroy();

    const upward = createDropdownMenu();
    upward.registerItem({ id: 'one', text: 'One' });
    upward.registerItem({ id: 'two', text: 'Two' });
    upward.handleTrigger(keyboard('ArrowUp'));
    expect(upward.getSnapshot().activeId).toBe('two');
    upward.destroy();
    const emptyUpward = createDropdownMenu();
    emptyUpward.handleTrigger(keyboard('ArrowUp'));
    expect(emptyUpward.getSnapshot().activeId).toBeNull();
    emptyUpward.destroy();

    const context = createContextMenu();
    const content = document.createElement('div');
    const invalid = new MouseEvent('contextmenu', { cancelable: true });
    expect(context.handleContextMenu(invalid, content)()).toBeUndefined();
    context.destroy();
    context.destroy();
    expect(context.handleContextMenu(invalid, content)()).toBeUndefined();
    const keyboardOpen = keyboard('ContextMenu');
    expect(context.handleKeyboardOpen(keyboardOpen, content, content)()).toBeUndefined();
    expect(keyboardOpen.defaultPrevented).toBe(false);

    const destroyedDropdown = createDropdownMenu();
    destroyedDropdown.destroy();
    const click = new MouseEvent('click', { cancelable: true });
    destroyedDropdown.handleTrigger(click);
    expect(click.defaultPrevented).toBe(false);
  });
});

describe('Tree View', () => {
  it('traverses hierarchy, computes aria metadata, handles selection and dynamic removal', () => {
    vi.useFakeTimers();
    const tree = createTreeView({ multiple: true });
    tree.registerNode({ id: 'root', text: 'Root', hasChildren: true, loading: true });
    const removeChild = tree.registerNode({
      id: 'child',
      text: 'Child',
      parentId: 'root',
      hasChildren: true,
    });
    tree.registerNode({ id: 'leaf', text: 'Leaf', parentId: 'child' });
    tree.registerNode({ id: 'disabled', text: 'Disabled', parentId: 'root', disabled: true });
    tree.toggle('root');
    expect(tree.getSnapshot().visibleNodes[0]?.loading).toBe(true);
    expect(tree.getSnapshot().visibleNodes.map((node) => node.tabIndex)).toEqual([0, -1, -1]);
    expect(tree.getSnapshot().visibleNodes.map((node) => node.id)).toEqual([
      'root',
      'child',
      'disabled',
    ]);
    tree.setActive('child');
    expect(tree.getSnapshot().visibleNodes.map((node) => node.tabIndex)).toEqual([-1, 0, -1]);
    tree.handleKeyDown(keyboard('ArrowRight'));
    expect(tree.getSnapshot().expandedIds).toEqual(['root', 'child']);
    tree.handleKeyDown(keyboard('ArrowRight'));
    expect(tree.getSnapshot().activeId).toBe('leaf');
    tree.handleKeyDown(keyboard('ArrowLeft'));
    expect(tree.getSnapshot().activeId).toBe('child');
    tree.handleKeyDown(keyboard(' '));
    tree.select('root');
    expect(tree.getSnapshot().selectedIds).toEqual(['child', 'root']);
    tree.handleKeyDown(keyboard('End'));
    tree.handleKeyDown(keyboard('r'));
    vi.advanceTimersByTime(500);
    const cancel = tree.on('beforeExpand', (event) => event.preventDefault());
    tree.toggle('root');
    expect(tree.getSnapshot().expandedIds).toContain('root');
    cancel();
    tree.setActive('child');
    removeChild();
    expect(tree.getSnapshot().activeId).not.toBe('child');
    tree.destroy();
  });

  it('keeps the active Tree node visible across child-first registration and collapse', () => {
    const tree = createTreeView();
    tree.registerNode({ id: 'child', text: 'Child', parentId: 'root' });
    expect(tree.getSnapshot().activeId).toBeNull();
    tree.registerNode({ id: 'root', text: 'Root', hasChildren: true });
    expect(tree.getSnapshot().activeId).toBe('root');
    tree.toggle('root');
    tree.setActive('child');
    expect(tree.getSnapshot().activeId).toBe('child');
    tree.toggle('root');
    expect(tree.getSnapshot().activeId).toBe('root');
    expect(tree.getSnapshot().visibleNodes.map((node) => node.tabIndex)).toEqual([0]);
    tree.setActive('missing');
    expect(tree.getSnapshot().activeId).toBe('root');
    tree.destroy();

    const ordered = createTreeView();
    const stale = ordered.registerNode({ id: 'a', text: 'Old A' });
    ordered.registerNode({ id: 'b', text: 'B' });
    ordered.registerNode({ id: 'a', text: 'New A' });
    stale();
    expect(ordered.getSnapshot().visibleNodes.map((node) => node.id)).toEqual(['a', 'b']);
    ordered.destroy();
  });
});

describe('Command Palette and Navigation Menu composition', () => {
  it('filters and invokes commands, handles shortcut and cancellation', () => {
    const performed = vi.fn();
    const palette = createCommandPalette({ shortcut: { key: 'p' } });
    palette.registerCommand({
      id: 'open',
      text: 'Open file',
      keywords: ['document'],
      group: 'File',
      perform: performed,
    });
    palette.registerCommand({ id: 'disabled', text: 'Disabled', disabled: true, perform: vi.fn() });
    palette.setQuery('opf', { reason: 'input' });
    expect(palette.getSnapshot().commands[0]?.id).toBe('open');
    const cancel = palette.on('beforeSelect', (event) => event.preventDefault());
    palette.select('open');
    expect(performed).not.toHaveBeenCalled();
    cancel();
    palette.select('open', { reason: 'pointer' });
    expect(performed).toHaveBeenCalledOnce();
    const release = palette.bindShortcut(document);
    document.dispatchEvent(keyboard('p', { ctrlKey: true }));
    palette.handleKeyDown(keyboard('Home'));
    palette.handleKeyDown(keyboard('End'));
    palette.handleKeyDown(keyboard('ArrowDown'));
    palette.handleKeyDown(keyboard('ArrowUp'));
    palette.handleKeyDown(keyboard('Escape'));
    release();
    palette.destroy();
  });

  it('reuses Menu, Disclosure and positioning for desktop/compact navigation', () => {
    vi.useFakeTimers();
    const navigation = createNavigationMenu({ mode: 'desktop', openDelay: 50, closeDelay: 60 });
    const remove = navigation.registerItem({ id: 'products', text: 'Products', hasContent: true });
    navigation.registerItem({ id: 'about', text: 'About' });
    navigation.scheduleOpen('products');
    vi.advanceTimersByTime(50);
    expect(navigation.getSnapshot().openId).toBe('products');
    navigation.scheduleClose();
    vi.advanceTimersByTime(60);
    expect(navigation.getSnapshot().openId).toBeNull();
    navigation.setMode('compact');
    navigation.scheduleOpen('products');
    expect(navigation.getSnapshot().openId).toBe('products');
    const trigger = document.createElement('button');
    const content = document.createElement('div');
    const outside = document.createElement('button');
    document.body.append(trigger, content, outside);
    navigation.bind({ trigger, content });
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(navigation.getSnapshot().openId).toBeNull();
    navigation.openItem('products');
    navigation.handleKeyDown(keyboard('Escape'));
    expect(navigation.getSnapshot().openId).toBeNull();
    remove();
    navigation.destroy();
  });

  it('commits controlled navigation only after notification and supports zero-delay pointer events', () => {
    let openId: string | null = null;
    let notify: () => void = () => undefined;
    const request = vi.fn<(next: string | null) => void>();
    const controlled = createNavigationMenu({
      getValue: () => openId,
      onValueChange: request,
      subscribeValue(listener) {
        notify = listener;
        return () => undefined;
      },
    });
    controlled.registerItem({ id: 'disabled', text: 'Disabled', disabled: true, hasContent: true });
    controlled.registerItem({ id: 'products', text: 'Products', hasContent: true });
    controlled.openItem('missing');
    controlled.openItem('disabled');
    controlled.close();
    controlled.openItem('products', { reason: 'keyboard' });
    expect(controlled.getSnapshot().openId).toBeNull();
    openId = request.mock.calls.at(-1)?.[0] ?? null;
    notify();
    expect(controlled.getSnapshot().openId).toBe('products');
    controlled.destroy();

    const immediate = createNavigationMenu({ openDelay: 0, closeDelay: 0 });
    const release = immediate.registerItem({ id: 'services', text: 'Services', hasContent: true });
    const pointer = new PointerEvent('pointermove');
    immediate.scheduleOpen('services', pointer);
    expect(immediate.getSnapshot().openId).toBe('services');
    immediate.scheduleClose(pointer);
    expect(immediate.getSnapshot().openId).toBeNull();
    release();
    release();
    immediate.scheduleOpen('services');
    immediate.destroy();
    immediate.scheduleClose();
  });

  it('opens a closed Navigation Menu from an explicitly identified keyboard trigger', () => {
    const navigation = createNavigationMenu({ id: 'navigation-content' });
    const firstTrigger = document.createElement('button');
    const targetTrigger = document.createElement('button');
    const disabledTrigger = document.createElement('button');
    const plainTrigger = document.createElement('a');
    document.body.append(firstTrigger, targetTrigger, disabledTrigger, plainTrigger);
    navigation.registerItem({ id: 'products', text: 'Products', hasContent: true }, firstTrigger);
    navigation.registerItem(
      { id: 'solutions', text: 'Solutions', hasContent: true },
      targetTrigger,
    );
    navigation.registerItem(
      { id: 'disabled', text: 'Disabled', disabled: true, hasContent: true },
      disabledTrigger,
    );
    navigation.registerItem({ id: 'plain', text: 'Plain link' }, plainTrigger);
    let openReason: string | undefined;
    navigation.on('open', (event) => {
      openReason = event.detail.details.reason;
    });
    const enter = keyboard('Enter');

    navigation.handleKeyDown('solutions', enter);

    expect(enter.defaultPrevented).toBe(true);
    expect(navigation.getSnapshot()).toMatchObject({
      contentId: 'navigation-content',
      openId: 'solutions',
      activeId: 'solutions',
    });
    expect(openReason).toBe('keyboard');

    const disabledEnter = keyboard('Enter');
    navigation.handleKeyDown('disabled', disabledEnter);
    expect(disabledEnter.defaultPrevented).toBe(false);
    expect(navigation.getSnapshot().openId).toBe('solutions');

    navigation.close();
    const plainEnter = keyboard('Enter');
    navigation.handleKeyDown('plain', plainEnter);
    expect(plainEnter.defaultPrevented).toBe(false);
    expect(navigation.getSnapshot().openId).toBeNull();

    targetTrigger.addEventListener('keydown', (event) => navigation.handleKeyDown(event));
    const inferredSpace = keyboard(' ');
    targetTrigger.dispatchEvent(inferredSpace);
    expect(inferredSpace.defaultPrevented).toBe(true);
    expect(navigation.getSnapshot().openId).toBe('solutions');
    navigation.destroy();
  });

  it('keeps dynamically registered triggers inside the active Navigation Menu branch set', () => {
    const navigation = createNavigationMenu({ mode: 'compact' });
    const content = document.createElement('div');
    const explicitBranch = document.createElement('button');
    const firstTrigger = document.createElement('button');
    const dynamicTrigger = document.createElement('button');
    document.body.append(content, explicitBranch, firstTrigger, dynamicTrigger);
    const releaseBinding = navigation.bind({ content, branches: [explicitBranch] });
    navigation.registerItem({ id: 'products', text: 'Products', hasContent: true }, firstTrigger);
    const removeDynamic = navigation.registerItem(
      { id: 'solutions', text: 'Solutions', hasContent: true },
      dynamicTrigger,
    );
    navigation.openItem('products');

    dynamicTrigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    explicitBranch.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(navigation.getSnapshot().openId).toBe('products');

    removeDynamic();
    dynamicTrigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(navigation.getSnapshot().openId).toBeNull();

    releaseBinding();
    releaseBinding();
    navigation.destroy();
  });

  it('keeps Navigation Menu registrations, anchors, and native links coherent', () => {
    const navigation = createNavigationMenu();
    const first = document.createElement('button');
    const stale = document.createElement('button');
    const replacement = document.createElement('button');
    const plain = document.createElement('a');
    const content = document.createElement('div');
    document.body.append(first, stale, replacement, plain, content);
    navigation.registerItem({ id: 'products', text: 'Products', hasContent: true }, first);
    const removeStale = navigation.registerItem(
      { id: 'solutions', text: 'Old solutions', hasContent: true },
      stale,
    );
    const removeCurrent = navigation.registerItem(
      { id: 'solutions', text: 'Solutions', hasContent: true },
      replacement,
    );
    navigation.registerItem({ id: 'plain', text: 'Plain link' }, plain);
    removeStale();
    navigation.bind({ trigger: first, content });
    navigation.openItem('solutions');
    expect(navigation.getSnapshot()).toMatchObject({
      openId: 'solutions',
      activeId: 'solutions',
    });
    expect(document.activeElement).toBe(replacement);

    const plainEnter = keyboard('Enter');
    navigation.handleKeyDown('plain', plainEnter);
    expect(plainEnter.defaultPrevented).toBe(false);
    const cancelClose = navigation.on('beforeClose', (event) => event.preventDefault());
    const arrowToPlain = keyboard('ArrowRight');
    navigation.handleKeyDown('solutions', arrowToPlain);
    expect(navigation.getSnapshot()).toMatchObject({
      openId: 'solutions',
      activeId: 'solutions',
    });
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(navigation.getSnapshot().openId).toBe('solutions');
    removeCurrent();
    removeCurrent();
    expect(navigation.getSnapshot().openId).toBeNull();
    cancelClose();
    navigation.destroy();
  });

  it('reports Navigation Menu focus dismissal without suppressing native Tab', () => {
    const navigation = createNavigationMenu();
    const trigger = document.createElement('button');
    const content = document.createElement('div');
    document.body.append(trigger, content);
    navigation.registerItem({ id: 'products', text: 'Products', hasContent: true }, trigger);
    navigation.bind({ trigger, content });
    navigation.openItem('products');
    const tab = keyboard('Tab');
    let closeDetails: { readonly reason: string; readonly event?: Event } | undefined;
    navigation.on('close', (event) => {
      closeDetails = event.detail.details;
    });

    navigation.handleKeyDown('products', tab);

    expect(tab.defaultPrevented).toBe(false);
    expect(navigation.getSnapshot().openId).toBeNull();
    expect(closeDetails).toEqual({ reason: 'focus-out', event: tab });
    navigation.destroy();
  });

  it('closes invalid controlled Navigation Menu registrations without recursion', () => {
    let openId: string | null = 'products';
    let notify: () => void = () => undefined;
    const request = vi.fn();
    const navigation = createNavigationMenu({
      getValue: () => openId,
      onValueChange: request,
      subscribeValue(listener) {
        notify = listener;
        return () => undefined;
      },
    });
    const remove = navigation.registerItem({
      id: 'products',
      text: 'Products',
      hasContent: true,
    });
    expect(navigation.getSnapshot().openId).toBe('products');
    navigation.registerItem({
      id: 'products',
      text: 'Disabled products',
      hasContent: true,
      disabled: true,
    });
    expect(navigation.getSnapshot().openId).toBeNull();
    expect(request).toHaveBeenCalledWith(null, { reason: 'programmatic' });
    remove();
    openId = null;
    notify();
    navigation.destroy();
  });
});
