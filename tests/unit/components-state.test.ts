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

  it('shares item navigation, separators, submenus, lifecycle, and wrappers', () => {
    vi.useFakeTimers();
    const menu = createMenu({ closeOnSelect: false });
    menu.registerItem({ id: 'new', text: 'New', submenuId: 'new-sub' });
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
    menu.handleKeyDown(keyboard('ArrowLeft'));
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
});
