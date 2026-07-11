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

describe('Accordion', () => {
  it('enforces single/multiple rules, dynamic cleanup and keyboard focus', () => {
    const accordion = createAccordion({ id: 'faq', type: 'single', collapsible: true });
    const first = document.createElement('button');
    const second = document.createElement('button');
    document.body.append(first, second);
    const removeA = accordion.registerItem({ id: 'a', text: 'Alpha' }, first);
    accordion.registerItem({ id: 'b', text: 'Beta', disabled: true }, second);
    accordion.registerItem({ id: 'c', text: 'Charlie' });
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
    accordion.handleTriggerKeyDown('c', keyboard('ArrowUp'));
    expect(accordion.getSnapshot().focusedId).toBe('a');
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
    const staleElement = document.createElement('button');
    const replacementElement = document.createElement('button');
    const stale = defaults.registerTab({ id: 'same', text: 'Old' }, staleElement);
    defaults.registerTab({ id: 'same', text: 'New' }, replacementElement);
    stale();
    defaults.handleKeyDown('same', keyboard('ArrowLeft'));
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
    const unbind = context.handleContextMenu(event, content);
    expect(event.defaultPrevented).toBe(true);
    expect(context.getSnapshot().open).toBe(true);
    unbind();
    context.handleKeyboardOpen(keyboard('x'), trigger, content);
    context.handleKeyboardOpen(keyboard('F10', { shiftKey: true }), trigger, content)();
    context.destroy();
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
    menu.handleKeyDown(keyboard('ArrowLeft'));
    expect(secondSubmenu.getSnapshot().open).toBe(false);
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
    expect(tree.getSnapshot().visibleNodes.map((node) => node.id)).toEqual([
      'root',
      'child',
      'disabled',
    ]);
    tree.setActive('child');
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
});
