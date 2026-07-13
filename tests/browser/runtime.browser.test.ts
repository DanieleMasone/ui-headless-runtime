import { afterEach, describe, expect, it } from 'vitest';
import {
  createCombobox,
  createDialog,
  createDropdownMenu,
  createListbox,
  createNavigationMenu,
  createPopover,
  createTabs,
  createTooltip,
} from '../../packages/ui-headless-runtime/src/index';
import { getOwnerWindow } from '../../packages/ui-headless-runtime/src/dom/dom';
import { getTabbableElements } from '../../packages/ui-headless-runtime/src/focus/focus';

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

  it('keeps only a nested modal path interactive and restores the parent focus layer', () => {
    const app = document.createElement('main');
    const parentTrigger = document.createElement('button');
    const portal = document.createElement('div');
    const parentContent = document.createElement('div');
    const parentAction = document.createElement('button');
    const childTrigger = document.createElement('button');
    const childContent = document.createElement('div');
    const childFirst = document.createElement('button');
    const childLast = document.createElement('button');
    app.append(parentTrigger);
    childContent.append(childFirst, childLast);
    parentContent.append(parentAction, childTrigger, childContent);
    portal.append(parentContent);
    document.body.append(app, portal);
    parentTrigger.focus();

    const parent = createDialog({ initialFocus: () => parentAction });
    const child = createDialog({ initialFocus: () => childFirst });
    const releaseInitialParentBinding = parent.bind({
      trigger: parentTrigger,
      content: parentContent,
    });
    child.bind({ trigger: childTrigger, content: childContent });
    parent.open();
    child.open();
    releaseInitialParentBinding();
    parent.bind({ trigger: parentTrigger, content: parentContent });

    expect(document.activeElement).toBe(childFirst);
    expect(app.inert).toBe(true);
    expect(parentAction.inert).toBe(true);
    expect(childTrigger.inert).toBe(true);
    childLast.focus();
    childLast.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(childFirst);

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    expect(child.getSnapshot().open).toBe(false);
    expect(parent.getSnapshot()).toMatchObject({ open: true, topmost: true });
    expect(parentAction.inert).toBe(false);
    expect(document.activeElement).toBe(childTrigger);

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    expect(parent.getSnapshot().open).toBe(false);
    expect(app.inert).toBe(false);
    expect(document.activeElement).toBe(parentTrigger);
    child.destroy();
    parent.destroy();
  });

  it('extends modal focus and inert ownership through a portalled non-trapping popover', () => {
    const app = document.createElement('main');
    const parentPortal = document.createElement('div');
    const childPortal = document.createElement('div');
    const trigger = document.createElement('button');
    const parentContent = document.createElement('div');
    const parentFirst = document.createElement('button');
    const parentLast = document.createElement('button');
    const childContent = document.createElement('div');
    const childFirst = document.createElement('button');
    const childLast = document.createElement('button');
    app.append(trigger);
    parentContent.append(parentFirst, parentLast);
    childContent.append(childFirst, childLast);
    parentPortal.append(parentContent);
    childPortal.append(childContent);
    document.body.append(app, parentPortal, childPortal);
    trigger.focus();

    const parent = createDialog({ initialFocus: () => parentFirst });
    const child = createPopover({ closeOnFocusOutside: false });
    parent.bind({ trigger, content: parentContent });
    child.bind({ content: childContent });
    parent.open();
    child.open();
    expect(app.inert).toBe(true);
    expect(childPortal.inert).toBe(false);
    expect(childContent.closest('[inert]')).toBeNull();

    childLast.focus();
    childLast.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(parentFirst);
    parentFirst.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(document.activeElement).toBe(childLast);

    child.close();
    expect(childPortal.inert).toBe(true);
    parent.close();
    expect(app.inert).toBe(false);
    expect(childPortal.inert).toBe(false);
    child.destroy();
    parent.destroy();
  });

  it('handles a synthetic Escape event again when it is legally redispatched', () => {
    const content = document.createElement('div');
    document.body.append(content);
    const popover = createPopover();
    popover.bind({ content });
    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    popover.open();
    document.dispatchEvent(escape);
    expect(popover.getSnapshot().open).toBe(false);
    popover.open();
    document.dispatchEvent(escape);
    expect(popover.getSnapshot().open).toBe(false);
    popover.destroy();
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

  it('opens a closed Navigation Menu from a registered trigger keyboard event', () => {
    const firstTrigger = document.createElement('button');
    firstTrigger.textContent = 'Products';
    const trigger = document.createElement('button');
    trigger.textContent = 'Solutions';
    const content = document.createElement('div');
    document.body.append(firstTrigger, trigger, content);
    const navigation = createNavigationMenu();
    navigation.registerItem({ id: 'products', text: 'Products', hasContent: true }, firstTrigger);
    navigation.registerItem({ id: 'solutions', text: 'Solutions', hasContent: true }, trigger);
    navigation.bind({ trigger, content });
    trigger.addEventListener('keydown', (event) => navigation.handleKeyDown(event));
    trigger.focus();
    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });

    trigger.dispatchEvent(enter);

    expect(enter.defaultPrevented).toBe(true);
    expect(navigation.getSnapshot()).toMatchObject({
      openId: 'solutions',
      activeId: 'solutions',
    });
    expect(document.activeElement).toBe(trigger);

    firstTrigger.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, composed: true, cancelable: true }),
    );
    expect(navigation.getSnapshot().openId).toBe('solutions');

    const outside = document.createElement('button');
    document.body.append(outside);
    outside.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, composed: true, cancelable: true }),
    );
    expect(navigation.getSnapshot().openId).toBeNull();
    navigation.destroy();
  });

  it('closes a bound Dropdown Menu on native Tab navigation without preventing it', () => {
    const trigger = document.createElement('button');
    const content = document.createElement('div');
    const item = document.createElement('button');
    content.append(item);
    document.body.append(trigger, content);
    const menu = createDropdownMenu();
    menu.registerItem({ id: 'action', text: 'Action' }, item);
    menu.bind({ trigger, content });
    menu.handleTrigger(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    expect(document.activeElement).toBe(item);
    const tab = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    menu.handleKeyDown(tab);
    trigger.focus();
    expect(tab.defaultPrevented).toBe(false);
    expect(menu.getSnapshot().open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    menu.destroy();
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

    const originalTrigger = document.createElement('button');
    const originalContent = document.createElement('div');
    const originalAction = document.createElement('button');
    originalContent.append(originalAction);
    document.body.append(originalTrigger, originalContent);
    const realmDialogTrigger = realmDocument.createElement('button');
    const realmDialogContent = realmDocument.createElement('div');
    const realmDialogAction = realmDocument.createElement('button');
    realmDialogContent.append(realmDialogAction);
    realmDocument.body.append(realmDialogTrigger, realmDialogContent);
    let preferredFocus = originalAction;
    originalTrigger.focus();
    const dialog = createDialog({ modal: false, initialFocus: () => preferredFocus });
    const releaseOriginalBinding = dialog.bind({
      trigger: originalTrigger,
      content: originalContent,
    });
    dialog.open();
    expect(document.activeElement).toBe(originalAction);
    releaseOriginalBinding();
    preferredFocus = realmDialogAction;
    dialog.bind({ trigger: realmDialogTrigger, content: realmDialogContent });
    expect(realmDocument.activeElement).toBe(realmDialogAction);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(dialog.getSnapshot().open).toBe(true);
    realmDocument.dispatchEvent(
      new KeyboardEventConstructor('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(dialog.getSnapshot().open).toBe(false);
    expect(realmDocument.activeElement).toBe(realmDialogTrigger);
    dialog.destroy();
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
