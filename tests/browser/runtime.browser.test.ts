import { afterEach, describe, expect, it } from 'vitest';
import {
  createCombobox,
  createDialog,
  createDropdownMenu,
  createListbox,
  createPopover,
  createTabs,
  createTooltip,
  getOwnerWindow,
  getTabbableElements,
} from '../../packages/ui-headless-runtime/src/index';

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.style.overflow = '';
});

describe('real-browser runtime integration', () => {
  it('traps and restores focus for a modal dialog', () => {
    const app = document.createElement('main');
    const trigger = document.createElement('button');
    trigger.textContent = 'Open';
    app.append(trigger);
    const portal = document.createElement('div');
    const content = document.createElement('div');
    const first = document.createElement('button');
    first.textContent = 'First';
    const last = document.createElement('button');
    last.textContent = 'Last';
    content.append(first, last);
    portal.append(content);
    document.body.append(app, portal);
    trigger.focus();
    const dialog = createDialog({ initialFocus: () => first });
    dialog.bind({ trigger, content });
    dialog.open();
    expect(document.activeElement).toBe(first);
    last.focus();
    last.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(first);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(dialog.getSnapshot().open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(document.documentElement.style.overflow).toBe('');
    dialog.destroy();
  });

  it('keeps parent popover open for a declared nested branch', () => {
    const trigger = document.createElement('button');
    const content = document.createElement('div');
    const nested = document.createElement('div');
    document.body.append(trigger, content, nested);
    const popover = createPopover();
    popover.bind({ trigger, content, branches: [nested] });
    popover.open();
    nested.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(popover.getSnapshot().open).toBe(true);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(popover.getSnapshot().open).toBe(false);
    popover.destroy();
  });

  it('updates active descendant and roving focus from real keyboard events', () => {
    const listbox = createListbox();
    listbox.registerOption({ id: 'a', text: 'Alpha' });
    listbox.registerOption({ id: 'b', text: 'Beta' });
    listbox.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    expect(listbox.getSnapshot().activeId).toBe('b');
    listbox.destroy();

    const first = document.createElement('button');
    const second = document.createElement('button');
    document.body.append(first, second);
    const tabs = createTabs();
    tabs.registerTab({ id: 'one', text: 'One' }, first);
    tabs.registerTab({ id: 'two', text: 'Two' }, second);
    tabs.handleKeyDown(
      'one',
      new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true }),
    );
    expect(document.activeElement).toBe(second);
    expect(tabs.getSnapshot().selectedId).toBe('two');
    tabs.destroy();
  });

  it('does not steal trigger focus for disclosure-like overlays and clears tooltip timers', () => {
    const trigger = document.createElement('button');
    const content = document.createElement('div');
    document.body.append(trigger, content);
    trigger.focus();
    const popover = createPopover();
    popover.bind({ trigger, content });
    popover.open();
    expect(document.activeElement).toBe(trigger);
    const tooltip = createTooltip({ openDelay: 0, closeDelay: 0 });
    tooltip.bind(trigger, content);
    tooltip.scheduleOpen('focus');
    expect(tooltip.getSnapshot().open).toBe(true);
    expect(document.activeElement).toBe(trigger);
    tooltip.destroy();
    tooltip.scheduleOpen('focus');
    expect(tooltip.getSnapshot().open).toBe(true);
    popover.destroy();
  });

  it('defers combobox filtering during composition and cleans bound DOM listeners', () => {
    const input = document.createElement('input');
    const popup = document.createElement('div');
    document.body.append(input, popup);
    const combobox = createCombobox();
    combobox.registerOption({ id: 'tokyo', text: 'Tokyo', value: 'tokyo' });
    const unbind = combobox.bind({ trigger: input, content: popup });
    combobox.handleCompositionStart();
    input.value = '東';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '東' }));
    expect(combobox.getSnapshot().query).toBe('');
    input.addEventListener('compositionend', (event) => combobox.handleCompositionEnd(event));
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '東' }));
    expect(combobox.getSnapshot().query).toBe('東');
    unbind();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    combobox.destroy();
    expect(combobox.getSnapshot().query).toBe('東');
  });

  it('uses each bound node realm for DOM classes, events, and owner window', () => {
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const realmDocument = iframe.contentDocument;
    const realmWindow = iframe.contentWindow;
    expect(realmDocument).not.toBeNull();
    expect(realmWindow).not.toBeNull();
    if (!realmDocument || !realmWindow) return;
    const trigger = realmDocument.createElement('button');
    const content = realmDocument.createElement('div');
    const item = realmDocument.createElement('button');
    content.append(item);
    realmDocument.body.append(trigger, content);
    const menu = createDropdownMenu();
    menu.registerItem({ id: 'realm-item', text: 'Realm item' }, item);
    menu.bind({ trigger, content });
    const KeyboardEventConstructor = (realmWindow as Window & typeof globalThis).KeyboardEvent;
    const event = new KeyboardEventConstructor('keydown', {
      key: 'ArrowDown',
      cancelable: true,
    });
    menu.handleTrigger(event);
    expect(menu.getSnapshot()).toMatchObject({ open: true, activeId: 'realm-item' });
    expect(event.defaultPrevented).toBe(true);
    expect(getOwnerWindow(trigger)).toBe(realmWindow);
    menu.destroy();
  });

  it('filters unavailable elements, closed details, and duplicate radio tab stops', () => {
    const container = document.createElement('div');
    const visible = document.createElement('button');
    const hiddenParent = document.createElement('div');
    hiddenParent.hidden = true;
    hiddenParent.append(document.createElement('button'));
    const ariaHiddenParent = document.createElement('div');
    ariaHiddenParent.setAttribute('aria-hidden', 'true');
    ariaHiddenParent.append(document.createElement('button'));
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    const summaryButton = document.createElement('button');
    summary.append(summaryButton);
    details.append(summary, document.createElement('button'));
    const firstRadio = document.createElement('input');
    firstRadio.type = 'radio';
    firstRadio.name = 'choice';
    const checkedRadio = document.createElement('input');
    checkedRadio.type = 'radio';
    checkedRadio.name = 'choice';
    checkedRadio.checked = true;
    container.append(visible, hiddenParent, ariaHiddenParent, details, firstRadio, checkedRadio);
    document.body.append(container);
    expect(getTabbableElements(container)).toEqual([visible, summaryButton, checkedRadio]);
  });
});
