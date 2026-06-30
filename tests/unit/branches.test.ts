import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createAccordion,
  createCombobox,
  createCommandPalette,
  createDialog,
  createListbox,
  createMenu,
  createNavigationMenu,
  createPopover,
  createTabs,
  createToast,
  createTooltip,
  createTreeView,
  type ToastRecord,
} from '../../packages/ui-headless-runtime/src/index';
import { createControllerHost } from '../../packages/ui-headless-runtime/src/core/host';

beforeAll(() => {
  if (globalThis.PointerEvent === undefined) {
    Object.defineProperty(globalThis, 'PointerEvent', { value: MouseEvent, configurable: true });
  }
});

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.style.overflow = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const key = (value: string, options: KeyboardEventInit = {}): KeyboardEvent =>
  new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...options });

describe('controller host edge policies', () => {
  it('queues reentrant snapshots and makes post-destroy APIs inert', () => {
    const host = createControllerHost<{ value: number }, { change: { value: number } }>({
      value: 0,
    });
    const values: number[] = [];
    const unsubscribe = host.subscribe((snapshot) => {
      values.push(snapshot.value);
      if (snapshot.value === 1) host.update({ value: 2 });
    });
    expect(host.update(host.getSnapshot())).toBe(false);
    expect(host.update({ value: 1 })).toBe(true);
    expect(values).toEqual([1, 2]);
    const listener = vi.fn();
    host.on('change', listener);
    host.once('change', listener);
    host.emit('change', { value: 2 });
    unsubscribe();
    unsubscribe();
    host.destroy();
    host.destroy();
    expect(host.update({ value: 3 })).toBe(false);
    host.subscribe(vi.fn())();
    host.on('change', vi.fn())();
    host.once('change', vi.fn())();
    host.off('change', vi.fn());
  });

  it('keeps component registrations and delayed commands inert after destroy', async () => {
    vi.useFakeTimers();
    const listbox = createListbox();
    listbox.destroy();
    listbox.registerOption({ id: 'late', text: 'Late' })();
    listbox.setActive('late');
    listbox.select('late');
    listbox.handleKeyDown(key('l'));
    expect(listbox.getSnapshot().options).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);

    const tree = createTreeView();
    tree.destroy();
    tree.registerNode({ id: 'late', text: 'Late' })();
    tree.toggle('late');
    tree.select('late');
    tree.setActive('late');
    tree.handleKeyDown(key('l'));
    expect(tree.getSnapshot().visibleNodes).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);

    const accordion = createAccordion();
    accordion.destroy();
    accordion.registerItem({ id: 'late', text: 'Late' })();
    accordion.toggle('late');
    accordion.focus('late');
    accordion.handleTriggerKeyDown('late', key('Enter'));

    const tabs = createTabs();
    tabs.destroy();
    tabs.registerTab({ id: 'late', text: 'Late' })();
    tabs.select('late');
    tabs.focus('late');
    tabs.handleKeyDown('late', key('ArrowRight'));

    const menu = createMenu();
    menu.destroy();
    menu.registerItem({ id: 'late', text: 'Late' })();
    menu.setActive('late');
    menu.select('late');
    menu.handleKeyDown(key('ArrowDown'));

    const dialog = createDialog();
    dialog.destroy();
    dialog.subscribe(vi.fn())();
    dialog.bind({ content: document.createElement('div') })();
    dialog.open();
    dialog.close();
    dialog.toggle();

    const popover = createPopover();
    popover.destroy();
    popover.bind({ content: document.createElement('div') })();
    popover.open();
    popover.close();
    popover.toggle();
    popover.updatePosition();

    const tooltip = createTooltip();
    tooltip.destroy();
    tooltip.subscribe(vi.fn())();
    tooltip.bind(document.createElement('button'), document.createElement('div'))();
    tooltip.scheduleOpen();
    tooltip.scheduleClose();
    tooltip.close();

    const combobox = createCombobox();
    combobox.destroy();
    combobox.registerOption({ id: 'late', text: 'Late', value: 'late' })();
    combobox.setInputValue('late');
    combobox.handleKeyDown(key('ArrowDown'));
    combobox.handleCompositionStart();
    combobox.select('late');
    await combobox.refresh();

    const palette = createCommandPalette();
    palette.destroy();
    palette.registerCommand({ id: 'late', text: 'Late', perform: vi.fn() })();
    palette.bindShortcut(document)();
    palette.setQuery('late');
    palette.select('late');
    palette.handleKeyDown(key('ArrowDown'));

    const navigation = createNavigationMenu();
    navigation.destroy();
    navigation.registerItem({ id: 'late', text: 'Late' })();
    navigation.scheduleOpen('late');
    navigation.scheduleClose();
    navigation.openItem('late');
    navigation.close();
    navigation.handleKeyDown(key('ArrowDown'));
    navigation.setMode('compact');

    const toast = createToast();
    toast.destroy();
    toast.show({ message: 'Late' });
    toast.update('late', { message: 'Later' });
    toast.pause('late');
    toast.resume('late');
    toast.dismiss('late');
  });
});

describe('controlled collection components', () => {
  it('covers controlled Accordion options and keyboard/no-op branches', () => {
    const defaults = createAccordion();
    const firstDefault = defaults.registerItem({ id: 'default', text: 'Default' });
    defaults.handleTriggerKeyDown('default', key('ArrowDown'));
    firstDefault();
    defaults.destroy();
    let value: readonly string[] = ['one'];
    let notify: () => void = () => undefined;
    const accordion = createAccordion({
      id: 'controlled',
      type: 'single',
      collapsible: false,
      loop: false,
      defaultValue: [],
      getValue: () => value,
      onValueChange(next) {
        value = next;
      },
      subscribeValue(listener) {
        notify = listener;
        return vi.fn();
      },
    });
    const removeOne = accordion.registerItem({
      id: 'one',
      text: 'One',
      triggerId: 'one-t',
      panelId: 'one-p',
    });
    accordion.registerItem({ id: 'two', text: 'Two' });
    accordion.toggle('one');
    accordion.toggle('missing');
    accordion.focus('missing');
    accordion.handleTriggerKeyDown('one', key('ArrowDown'));
    accordion.handleTriggerKeyDown('two', key('ArrowDown'));
    accordion.handleTriggerKeyDown('two', key('Home'));
    accordion.handleTriggerKeyDown('one', key('x'));
    accordion.toggle('two', { reason: 'keyboard', event: key('Enter') });
    notify();
    expect(accordion.getSnapshot()).toMatchObject({ controlled: true, expandedIds: ['two'] });
    removeOne();
    removeOne();
    accordion.destroy();
    const replacement = createAccordion();
    const triggerA = document.createElement('button');
    const triggerB = document.createElement('button');
    const stale = replacement.registerItem({ id: 'same', text: 'Old' }, triggerA);
    replacement.registerItem({ id: 'same', text: 'New' }, triggerB);
    stale();
    replacement.destroy();
  });

  it('covers controlled Tabs, custom IDs, cancellation and invalid targets', () => {
    let selected: string | null = 'a';
    let notify: () => void = () => undefined;
    const tabs = createTabs({
      id: 'controlled-tabs',
      activation: 'automatic',
      orientation: 'horizontal',
      rtl: false,
      loop: false,
      defaultValue: null,
      getValue: () => selected,
      onValueChange(value) {
        selected = value;
      },
      subscribeValue(listener) {
        notify = listener;
        return () => undefined;
      },
    });
    const removeA = tabs.registerTab({ id: 'a', text: 'A', tabId: 'a-tab', panelId: 'a-panel' });
    tabs.registerTab({ id: 'b', text: 'B' });
    tabs.select('missing');
    tabs.focus('missing');
    tabs.focus('a');
    tabs.select('a');
    tabs.handleKeyDown('a', key('ArrowRight'));
    notify();
    tabs.handleKeyDown('b', key('ArrowRight'));
    tabs.handleKeyDown('b', key('ArrowLeft'));
    tabs.handleKeyDown('a', key('x'));
    removeA();
    removeA();
    tabs.destroy();
  });

  it('covers controlled single Listbox, cancellation, boundaries and cleanup', () => {
    vi.useFakeTimers();
    let selected: readonly string[] = ['a'];
    let notify: () => void = () => undefined;
    const listbox = createListbox({
      id: 'controlled-list',
      selectionMode: 'single',
      loop: false,
      defaultValue: [],
      getValue: () => selected,
      onValueChange(value) {
        selected = value;
      },
      subscribeValue(listener) {
        notify = listener;
        return () => undefined;
      },
    });
    const remove = listbox.registerOption({ id: 'a', text: 'Alpha', value: 'a' });
    listbox.registerOption({ id: 'b', text: 'Beta', value: 'b' });
    listbox.registerOption({ id: 'disabled-option', text: 'Disabled', disabled: true });
    listbox.setActive('missing');
    listbox.setActive('disabled-option');
    listbox.setActive(null);
    listbox.handleKeyDown(key('Enter'));
    listbox.handleKeyDown(key('ArrowDown'));
    const cancel = listbox.on('beforeSelect', (event) => event.preventDefault());
    listbox.select('b');
    cancel();
    listbox.select('b', { reason: 'pointer', event: new MouseEvent('click') });
    notify();
    listbox.select('b');
    listbox.handleKeyDown(key('ArrowUp'));
    listbox.handleKeyDown(key('ArrowDown'));
    listbox.handleKeyDown(key('z', { ctrlKey: true }));
    listbox.handleKeyDown(key('z'));
    listbox.handleKeyDown(key('z'));
    vi.advanceTimersByTime(500);
    remove();
    remove();
    listbox.destroy();
    listbox.handleKeyDown(key('ArrowDown'));
    const fallback = createListbox();
    fallback.registerOption({ id: 'fallback', text: 'Fallback' });
    fallback.select('fallback');
    expect(fallback.getSnapshot().selectedValues).toEqual(['fallback']);
    fallback.destroy();
  });
});

describe('overlay option branches', () => {
  it('covers explicit Dialog/Popover options, cancellations, binding cleanup and no tabbables', () => {
    let dialogOpen = false;
    let dialogNotify: () => void = () => undefined;
    const trigger = document.createElement('button');
    const content = document.createElement('div');
    const backdrop = document.createElement('div');
    document.body.append(trigger, content, backdrop);
    const dialog = createDialog({
      id: 'all-dialog',
      modal: false,
      defaultValue: false,
      getValue: () => dialogOpen,
      onValueChange(value) {
        dialogOpen = value;
      },
      subscribeValue(listener) {
        dialogNotify = listener;
        return () => undefined;
      },
      closeOnOutsidePointer: false,
      closeOnEscape: false,
      initialFocus: () => null,
      restoreFocus: false,
    });
    const unbind = dialog.bind({ trigger, content, backdrop });
    dialog.open({ reason: 'keyboard', event: key('Enter') });
    dialogNotify();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    document.dispatchEvent(key('Escape'));
    expect(dialogOpen).toBe(true);
    dialog.toggle();
    dialogNotify();
    unbind();
    unbind();
    dialog.destroy();
    expect(dialog.subscribe(vi.fn())).toBeTypeOf('function');

    const popover = createPopover({
      id: 'all-popover',
      defaultValue: true,
      closeOnFocusOutside: false,
      focusContent: true,
      restoreFocus: false,
      positioning: { placement: 'top', flip: false, shift: false },
      getValue: () => true,
      onValueChange: vi.fn(),
      subscribeValue: () => () => undefined,
    });
    const cancel = popover.on('beforeClose', (event) => event.preventDefault());
    popover.close();
    expect(popover.getSnapshot().open).toBe(true);
    cancel();
    popover.close({ reason: 'focus-out' });
    popover.destroy();
    expect(popover.bind({ content })).toBeTypeOf('function');

    const noAnchor = createPopover({ defaultValue: true });
    noAnchor.updatePosition();
    noAnchor.bind({ content });
    noAnchor.close();
    noAnchor.destroy();
  });

  it('covers Menu full configuration, closed toggle, invalid items, focus and timers', () => {
    vi.useFakeTimers();
    let open = false;
    let notify: () => void = () => undefined;
    const menu = createMenu({
      id: 'configured-menu',
      defaultValue: false,
      getValue: () => open,
      onValueChange(value) {
        open = value;
      },
      subscribeValue(listener) {
        notify = listener;
        return () => undefined;
      },
      positioning: { placement: 'right' },
      loop: false,
      closeOnSelect: true,
    });
    const element = document.createElement('button');
    document.body.append(element);
    const remove = menu.registerItem({ id: 'item', text: 'Item' }, element);
    menu.registerItem({ id: 'disabled', text: 'Disabled', disabled: true });
    menu.registerItem({ id: 'separator', text: '', kind: 'separator' });
    menu.setActive('item');
    menu.setActive('item');
    menu.setActive('disabled');
    menu.select('missing');
    menu.select('separator');
    menu.toggle({ reason: 'trigger' });
    notify();
    menu.handleKeyDown(key('ArrowUp'));
    menu.handleKeyDown(key('End'));
    menu.handleKeyDown(key('ArrowRight'));
    menu.handleKeyDown(key('i'));
    menu.handleKeyDown(key('i'));
    menu.handleKeyDown(key('x', { metaKey: true }));
    menu.select('item', { reason: 'pointer', event: new MouseEvent('click') });
    notify();
    menu.toggle();
    notify();
    vi.advanceTimersByTime(500);
    remove();
    remove();
    menu.destroy();
    menu.handleKeyDown(key('ArrowDown'));
    const defaults = createMenu();
    defaults.registerItem({ id: 'default', text: 'Default' });
    const cancelOpen = defaults.on('beforeOpen', (event) => event.preventDefault());
    defaults.open();
    cancelOpen();
    defaults.open();
    defaults.select('default');
    expect(defaults.getSnapshot().open).toBe(false);
    defaults.toggle();
    defaults.toggle();
    defaults.setActive(null);
    defaults.handleKeyDown(key('Enter'));
    defaults.handleKeyDown(key('ArrowRight'));
    defaults.handleKeyDown(key('q'));
    defaults.destroy();
  });
});

describe('remaining async, timing, and controlled branches', () => {
  it('covers Tooltip controlled options, real binding events and post-destroy policy', () => {
    vi.useFakeTimers();
    let open = false;
    let notify: () => void = () => undefined;
    const tooltip = createTooltip({
      id: 'controlled-tooltip',
      scope: 'controlled',
      defaultValue: false,
      getValue: () => open,
      onValueChange(value) {
        open = value;
      },
      subscribeValue(listener) {
        notify = listener;
        return () => undefined;
      },
      openDelay: 0,
      closeDelay: 0,
      positioning: { placement: 'top' },
    });
    const trigger = document.createElement('button');
    const content = document.createElement('div');
    document.body.append(trigger, content);
    const unbind = tooltip.bind(trigger, content);
    trigger.dispatchEvent(
      new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }),
    );
    notify();
    trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    notify();
    tooltip.scheduleOpen('focus', new FocusEvent('focusin'));
    notify();
    tooltip.close({ reason: 'escape-key' });
    notify();
    unbind();
    tooltip.destroy();
    tooltip.destroy();
    tooltip.scheduleOpen();
    tooltip.scheduleClose();
    expect(tooltip.subscribe(vi.fn())).toBeTypeOf('function');
    const defaults = createTooltip();
    defaults.scheduleOpen();
    vi.advanceTimersByTime(700);
    defaults.scheduleClose();
    vi.advanceTimersByTime(100);
    defaults.destroy();
  });

  it('covers controlled Toast, zero/null durations, missing update, and string promise messages', async () => {
    vi.useFakeTimers();
    let records: readonly ToastRecord[] = [];
    let notify: () => void = () => undefined;
    const toast = createToast({
      maxVisible: 0,
      getToasts: () => records,
      onToastsChange(value) {
        records = value;
      },
      subscribeToasts(listener) {
        notify = listener;
        return () => undefined;
      },
    });
    toast.update('missing', { message: 'x' });
    toast.pause('missing');
    toast.resume('missing');
    const zero = toast.show({ message: 'Zero', duration: 0 });
    notify();
    toast.pause(zero);
    notify();
    toast.pause(zero);
    toast.resume(zero);
    notify();
    toast.resume(zero);
    toast.show({ message: 'Generated', duration: null, politeness: 'assertive', status: 'info' });
    notify();
    const promise = toast.promise(
      Promise.resolve('yes'),
      {
        loading: 'Loading',
        success: 'Success',
        error: 'Error',
      },
      { id: 'promise', duration: 20, priority: 2, politeness: 'polite' },
    );
    notify();
    await expect(promise).resolves.toBe('yes');
    notify();
    toast.destroy();
  });

  it('covers custom Combobox filter, no-loader refresh, invalid input, cancellation and cleanup', async () => {
    let input = 'initial';
    let selected: string | null = 'x';
    let inputNotify: () => void = () => undefined;
    let selectedNotify: () => void = () => undefined;
    const combobox = createCombobox({
      id: 'configured-combo',
      defaultInputValue: 'fallback',
      defaultSelectedValue: null,
      getInputValue: () => input,
      onInputValueChange(value) {
        input = value;
      },
      subscribeInputValue(listener) {
        inputNotify = listener;
        return () => undefined;
      },
      getSelectedValue: () => selected,
      onSelectedValueChange(value) {
        selected = value;
      },
      subscribeSelectedValue(listener) {
        selectedNotify = listener;
        return () => undefined;
      },
      filter: (option, query) => option.text.startsWith(query),
      positioning: { placement: 'bottom-end' },
    });
    const remove = combobox.registerOption({ id: 'x', text: 'initial item', value: 'x' });
    combobox.setInputValue('initial');
    combobox.handleCompositionStart();
    const inputEvent = new InputEvent('input');
    combobox.handleInput(inputEvent);
    await combobox.refresh();
    const composition = new CompositionEvent('compositionend');
    combobox.handleCompositionEnd(composition);
    const cancel = combobox.on('beforeSelect', (event) => event.preventDefault());
    combobox.select('x');
    cancel();
    combobox.select('x', { reason: 'pointer', event: new MouseEvent('click') });
    inputNotify();
    selectedNotify();
    remove();
    remove();
    combobox.destroy();
  });

  it('propagates non-abort Combobox loader failures', async () => {
    const failure = new Error('network');
    const combobox = createCombobox({ loadOptions: async () => Promise.reject(failure) });
    await expect(combobox.refresh()).rejects.toBe(failure);
    combobox.destroy();
  });
});

describe('Command Palette, Tree, and Navigation branches', () => {
  it('covers controlled query, custom matcher, async command, shortcut filters and explicit open/close', async () => {
    let query = '';
    let notify: () => void = () => undefined;
    const performed = vi.fn(async () => Promise.resolve());
    const palette = createCommandPalette({
      dialog: { id: 'palette-dialog', defaultValue: false },
      shortcut: { key: 'p', ctrlOrMeta: false, alt: true, shift: true },
      defaultQuery: 'fallback',
      getQuery: () => query,
      onQueryChange(value) {
        query = value;
      },
      subscribeQuery(listener) {
        notify = listener;
        return () => undefined;
      },
      matcher: (command, value) => (command.text.includes(value) ? 1 : Number.NEGATIVE_INFINITY),
    });
    const remove = palette.registerCommand({ id: 'async', text: 'async', perform: performed });
    palette.registerCommand({ id: 'disabled', text: 'disabled', disabled: true, perform: vi.fn() });
    palette.setQuery('async', { reason: 'input', event: new InputEvent('input') });
    notify();
    palette.setQuery('async');
    palette.select('missing');
    palette.select('disabled');
    palette.open({ reason: 'shortcut', event: key('p') });
    palette.close({ reason: 'keyboard', event: key('Escape') });
    const release = palette.bindShortcut(document);
    document.dispatchEvent(key('x', { altKey: true, shiftKey: true }));
    document.dispatchEvent(key('p', { altKey: false, shiftKey: true }));
    document.dispatchEvent(key('p', { altKey: true, shiftKey: false }));
    document.dispatchEvent(key('p', { altKey: true, shiftKey: true }));
    palette.select('async', { reason: 'keyboard', event: key('Enter') });
    expect(performed).toHaveBeenCalledOnce();
    palette.setQuery('none');
    notify();
    palette.handleKeyDown(key('Enter'));
    palette.handleKeyDown(key('x'));
    remove();
    release();
    palette.destroy();
    await Promise.resolve();
    const defaults = createCommandPalette();
    defaults.registerCommand({ id: 'one', text: 'One', perform: () => undefined });
    const cancelOpen = defaults.on('beforeOpen', (event) => event.preventDefault());
    defaults.open();
    cancelOpen();
    defaults.open();
    const defaultShortcut = defaults.bindShortcut(document);
    document.dispatchEvent(key('x', { ctrlKey: true }));
    document.dispatchEvent(key('k'));
    document.dispatchEvent(key('k', { ctrlKey: true }));
    defaults.handleKeyDown(key('ArrowDown'));
    defaults.handleKeyDown(key('ArrowUp'));
    defaults.handleKeyDown(key('Home'));
    defaults.handleKeyDown(key('End'));
    defaults.handleKeyDown(key('Enter'));
    defaultShortcut();
    defaults.destroy();
    const empty = createCommandPalette();
    empty.handleKeyDown(key('ArrowDown'));
    empty.handleKeyDown(key('ArrowUp'));
    empty.handleKeyDown(key('Home'));
    empty.handleKeyDown(key('End'));
    empty.destroy();
  });

  it('covers controlled single Tree invalid/cyclic/dynamic and keyboard branches', () => {
    vi.useFakeTimers();
    let expanded: readonly string[] = [];
    let selected: readonly string[] = [];
    let expandedNotify: () => void = () => undefined;
    let selectedNotify: () => void = () => undefined;
    const tree = createTreeView({
      multiple: false,
      defaultExpandedIds: ['fallback'],
      defaultSelectedIds: ['fallback'],
      getExpandedIds: () => expanded,
      onExpandedIdsChange(value) {
        expanded = value;
      },
      subscribeExpandedIds(listener) {
        expandedNotify = listener;
        return () => undefined;
      },
      getSelectedIds: () => selected,
      onSelectedIdsChange(value) {
        selected = value;
      },
      subscribeSelectedIds(listener) {
        selectedNotify = listener;
        return () => undefined;
      },
    });
    const stale = tree.registerNode({ id: 'root', text: 'Old' });
    const current = tree.registerNode({ id: 'root', text: 'Root', hasChildren: true });
    tree.registerNode({ id: 'child', text: 'Child', parentId: 'root' });
    tree.registerNode({ id: 'cycle-a', text: 'Cycle A', parentId: 'cycle-b' });
    tree.registerNode({ id: 'cycle-b', text: 'Cycle B', parentId: 'cycle-a' });
    tree.registerNode({ id: 'disabled', text: 'Disabled', disabled: true });
    tree.toggle('missing');
    tree.toggle('child');
    tree.select('missing');
    tree.select('disabled');
    tree.setActive('disabled');
    tree.toggle('root', { reason: 'async-load' });
    expandedNotify();
    tree.setActive('root');
    tree.handleKeyDown(key('ArrowDown'));
    tree.handleKeyDown(key('ArrowUp'));
    tree.handleKeyDown(key('Home'));
    tree.handleKeyDown(key('ArrowLeft'));
    tree.handleKeyDown(key('Enter'));
    selectedNotify();
    tree.select('child');
    selectedNotify();
    const cancelSelect = tree.on('beforeSelect', (event) => event.preventDefault());
    tree.select('root');
    cancelSelect();
    tree.handleKeyDown(key('c'));
    tree.handleKeyDown(key('c'));
    vi.advanceTimersByTime(500);
    tree.handleKeyDown(key('x', { altKey: true }));
    stale();
    current();
    current();
    tree.destroy();
  });

  it('covers controlled Navigation Menu disabled/cancel/delay-zero/keyboard and cleanup branches', () => {
    const defaults = createNavigationMenu();
    defaults.destroy();
    let openId: string | null = null;
    let notify: () => void = () => undefined;
    const navigation = createNavigationMenu({
      mode: 'compact',
      openDelay: 0,
      closeDelay: 0,
      defaultValue: null,
      getValue: () => openId,
      onValueChange(value) {
        openId = value;
      },
      subscribeValue(listener) {
        notify = listener;
        return () => undefined;
      },
      positioning: { placement: 'bottom' },
    });
    const remove = navigation.registerItem({
      id: 'products',
      text: 'Products',
      hasContent: true,
      disabled: false,
    });
    navigation.registerItem({ id: 'disabled', text: 'Disabled', disabled: true, hasContent: true });
    navigation.openItem('missing');
    navigation.openItem('disabled');
    const cancel = navigation.on('beforeOpen', (event) => event.preventDefault());
    navigation.openItem('products');
    cancel();
    navigation.scheduleOpen('products', new PointerEvent('pointerenter'));
    notify();
    navigation.scheduleOpen('products');
    const cancelClose = navigation.on('beforeClose', (event) => event.preventDefault());
    navigation.close();
    cancelClose();
    navigation.scheduleClose(new PointerEvent('pointerleave'));
    notify();
    navigation.setMode('compact');
    navigation.handleKeyDown(key('ArrowDown'));
    navigation.handleKeyDown(key('Enter'));
    navigation.handleKeyDown(key('x'));
    navigation.setMode('desktop');
    remove();
    remove();
    navigation.destroy();
  });
});
