import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createCombobox,
  createDialog,
  createPopover,
  createToast,
  createTooltip,
  type ToastRecord,
} from '../../packages/ui-headless-runtime/src/index';
beforeAll(() => {
  if (globalThis.PointerEvent === undefined) {
    Object.defineProperty(globalThis, 'PointerEvent', { value: MouseEvent, configurable: true });
  }
});

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.style.overflow = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const visible = (element: HTMLElement): void => {
  vi.spyOn(element, 'getClientRects').mockReturnValue({ length: 1 } as DOMRectList);
};

describe('Dialog and Popover overlays', () => {
  it('uses the authoritative controlled Dialog value for the initial snapshot', () => {
    const content = document.createElement('div');
    document.body.append(content);
    const dialog = createDialog({
      defaultValue: false,
      getValue: () => true,
      modal: false,
    });

    expect(dialog.getSnapshot()).toMatchObject({
      open: true,
      controlled: true,
      topmost: false,
    });

    const unbind = dialog.bind({ content });
    expect(dialog.getSnapshot().topmost).toBe(true);

    unbind();
    dialog.destroy();
  });

  it('manages modal focus, inerting, scroll lock, outside dismissal and restoration', () => {
    const app = document.createElement('main');
    const portal = document.createElement('div');
    const trigger = document.createElement('button');
    const content = document.createElement('div');
    const input = document.createElement('input');
    content.append(input);
    app.append(trigger);
    portal.append(content);
    document.body.append(app, portal);
    visible(input);
    trigger.focus();
    const dialog = createDialog({ id: 'confirm', initialFocus: () => input });
    const unbind = dialog.bind({ trigger, content });
    const events: string[] = [];
    dialog.on('beforeOpen', () => events.push('beforeOpen'));
    dialog.on('open', () => events.push('open'));
    dialog.on('afterOpen', () => events.push('afterOpen'));
    dialog.open();
    expect(dialog.getSnapshot()).toMatchObject({
      open: true,
      modal: true,
      topmost: true,
      ariaModal: true,
      hasBackdrop: false,
    });
    expect(document.activeElement).toBe(input);
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(app.inert).toBe(true);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(dialog.getSnapshot().open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(events).toEqual(['beforeOpen', 'open', 'afterOpen']);
    expect(document.documentElement.style.overflow).toBe('');
    unbind();
    dialog.destroy();
    dialog.destroy();
  });

  it('only lets the topmost nested dialog consume Escape and tolerates invalid restore targets', () => {
    const triggerA = document.createElement('button');
    const triggerB = document.createElement('button');
    const contentA = document.createElement('div');
    const contentB = document.createElement('div');
    document.body.append(triggerA, contentA, triggerB, contentB);
    const parent = createDialog({ modal: false });
    const child = createDialog({ modal: false });
    parent.bind({ trigger: triggerA, content: contentA, branches: [contentB] });
    child.bind({ trigger: triggerB, content: contentB });
    parent.open();
    child.open();
    expect(parent.getSnapshot().ariaModal).toBeNull();
    expect(parent.getSnapshot().topmost).toBe(false);
    expect(child.getSnapshot().topmost).toBe(true);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    expect(child.getSnapshot().open).toBe(false);
    expect(parent.getSnapshot().open).toBe(true);
    triggerA.remove();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    expect(parent.getSnapshot().open).toBe(false);
    child.destroy();
    parent.destroy();

    const destroyed = createDialog();
    destroyed.destroy();
    const lateBackdrop = document.createElement('div');
    destroyed.bind({ content: contentA, backdrop: lateBackdrop })();
    expect(destroyed.getSnapshot().hasBackdrop).toBe(false);
  });

  it('coordinates focus and inert state for nested modal content and out-of-order closes', () => {
    const app = document.createElement('main');
    const parentTrigger = document.createElement('button');
    const parentPortal = document.createElement('div');
    const parentContent = document.createElement('div');
    const parentAction = document.createElement('button');
    const childTrigger = document.createElement('button');
    const childBackdrop = document.createElement('div');
    const childContent = document.createElement('div');
    const childAction = document.createElement('button');
    app.append(parentTrigger);
    childContent.append(childAction);
    parentContent.append(parentAction, childTrigger, childBackdrop, childContent);
    parentPortal.append(parentContent);
    document.body.append(app, parentPortal);
    visible(parentAction);
    visible(childAction);
    parentTrigger.focus();

    const parent = createDialog({ initialFocus: () => parentAction });
    const child = createDialog({ initialFocus: () => childAction });
    const releaseInitialParentBinding = parent.bind({
      trigger: parentTrigger,
      content: parentContent,
    });
    child.bind({ trigger: childTrigger, content: childContent, backdrop: childBackdrop });

    parent.open();
    expect(document.activeElement).toBe(parentAction);
    child.open();
    expect(document.activeElement).toBe(childAction);
    expect(parent.getSnapshot()).toMatchObject({ open: true, topmost: false });
    expect(child.getSnapshot()).toMatchObject({ open: true, topmost: true });
    expect(app.inert).toBe(true);
    expect(parentAction.inert).toBe(true);
    expect(childTrigger.inert).toBe(true);
    expect(childBackdrop.inert).not.toBe(true);
    expect(childContent.inert).not.toBe(true);

    releaseInitialParentBinding();
    const releaseParentRebind = parent.bind({ trigger: parentTrigger, content: parentContent });
    expect(child.getSnapshot().topmost).toBe(true);
    expect(document.activeElement).toBe(childAction);
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(child.getSnapshot().open).toBe(false);
    expect(parent.getSnapshot()).toMatchObject({ open: true, topmost: true });

    child.open();
    childBackdrop.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(child.getSnapshot().open).toBe(false);
    expect(parent.getSnapshot()).toMatchObject({ open: true, topmost: true });
    expect(parentAction.inert).not.toBe(true);
    expect(app.inert).toBe(true);

    child.open();
    parent.close();
    expect(parent.getSnapshot().open).toBe(false);
    expect(child.getSnapshot()).toMatchObject({ open: true, topmost: true });
    expect(parentAction.inert).toBe(true);
    expect(app.inert).toBe(true);
    expect(document.activeElement).toBe(childAction);
    child.close();
    expect(app.inert).not.toBe(true);
    expect(parentAction.inert).not.toBe(true);
    expect(document.documentElement.style.overflow).toBe('');

    releaseParentRebind();
    child.destroy();
    parent.destroy();
  });

  it('finishes destroyed modal cleanup before publishing the restored topmost layer', () => {
    const parentContent = document.createElement('div');
    const parentAction = document.createElement('button');
    const childContent = document.createElement('div');
    const childAction = document.createElement('button');
    childContent.append(childAction);
    parentContent.append(parentAction, childContent);
    document.body.append(parentContent);
    visible(parentAction);
    visible(childAction);
    const parent = createDialog({ initialFocus: () => parentAction });
    const child = createDialog({ initialFocus: () => childAction });
    const originalParentActionInert = parentAction.inert;
    parent.bind({ content: parentContent });
    child.bind({ content: childContent });
    parent.open();
    child.open();
    expect(parentAction.inert).toBe(true);

    const inertWhenParentRegainedTopmost: boolean[] = [];
    parent.subscribe((snapshot) => {
      if (snapshot.open && snapshot.topmost) {
        inertWhenParentRegainedTopmost.push(parentAction.inert);
      }
    });
    child.destroy();

    expect(parent.getSnapshot()).toMatchObject({ open: true, topmost: true });
    expect(inertWhenParentRegainedTopmost).toEqual([originalParentActionInert]);
    expect(parentAction.inert).toBe(originalParentActionInert);
    parent.destroy();
  });

  it('preserves modal focus ownership across rebinds and controlled external close', () => {
    const outside = document.createElement('button');
    const content = document.createElement('div');
    const first = document.createElement('button');
    const last = document.createElement('button');
    content.append(first, last);
    document.body.append(outside, content);
    visible(first);
    visible(last);
    visible(outside);
    outside.focus();
    const dialog = createDialog({ initialFocus: () => outside });
    const releaseInitialBinding = dialog.bind({ content });
    dialog.open();
    expect(document.activeElement).toBe(first);
    last.focus();
    releaseInitialBinding();
    const releaseReboundBinding = dialog.bind({ content });
    expect(document.activeElement).toBe(last);
    dialog.close();
    expect(document.activeElement).toBe(outside);
    releaseReboundBinding();
    dialog.destroy();

    let open = true;
    let notify: () => void = () => undefined;
    const trigger = document.createElement('button');
    document.body.append(trigger);
    const controlled = createDialog({
      getValue: () => open,
      subscribeValue(listener) {
        notify = listener;
        return () => undefined;
      },
      initialFocus: () => first,
    });
    controlled.bind({ trigger, content });
    expect(document.activeElement).toBe(first);
    open = false;
    notify();
    expect(document.activeElement).toBe(trigger);
    controlled.destroy();
  });

  it('focuses replacement content when a topmost modal is rebound during its open session', () => {
    const outside = document.createElement('button');
    const originalContent = document.createElement('div');
    const originalAction = document.createElement('button');
    const replacementContent = document.createElement('div');
    const replacementAction = document.createElement('button');
    originalContent.append(originalAction);
    replacementContent.append(replacementAction);
    document.body.append(outside, originalContent, replacementContent);
    visible(outside);
    visible(originalAction);
    visible(replacementAction);
    outside.focus();

    let preferredFocus = originalAction;
    const dialog = createDialog({ initialFocus: () => preferredFocus });
    const releaseOriginalBinding = dialog.bind({ content: originalContent });
    dialog.open();
    expect(document.activeElement).toBe(originalAction);

    releaseOriginalBinding();
    originalContent.remove();
    preferredFocus = replacementAction;
    const releaseReplacementBinding = dialog.bind({ content: replacementContent });
    expect(dialog.getSnapshot()).toMatchObject({ open: true, topmost: true });
    expect(document.activeElement).toBe(replacementAction);

    dialog.close();
    expect(document.activeElement).toBe(outside);
    releaseReplacementBinding();
    dialog.destroy();
  });

  it('keeps binding ownership per registration and cleans up fallback focus without clobbering consumers', () => {
    const originalTrigger = document.createElement('button');
    const replacementTrigger = document.createElement('button');
    const content = document.createElement('div');
    const backdrop = document.createElement('div');
    document.body.append(originalTrigger, replacementTrigger, content, backdrop);
    originalTrigger.focus();
    const dialog = createDialog();
    const elements = { trigger: originalTrigger, content, backdrop };
    const releaseFirst = dialog.bind(elements);
    const releaseLatest = dialog.bind(elements);

    releaseFirst();
    dialog.open();
    expect(dialog.getSnapshot()).toMatchObject({ open: true, topmost: true, hasBackdrop: true });
    expect(document.activeElement).toBe(content);
    expect(content.getAttribute('tabindex')).toBe('-1');
    dialog.close();
    expect(content.hasAttribute('tabindex')).toBe(false);
    expect(document.activeElement).toBe(originalTrigger);

    dialog.open();
    content.tabIndex = 0;
    originalTrigger.remove();
    const releaseReplacement = dialog.bind({ trigger: replacementTrigger, content, backdrop });
    dialog.close();
    expect(content.getAttribute('tabindex')).toBe('0');
    expect(document.activeElement).toBe(replacementTrigger);

    releaseLatest();
    expect(dialog.getSnapshot().hasBackdrop).toBe(true);
    releaseReplacement();
    expect(dialog.getSnapshot().hasBackdrop).toBe(false);
    dialog.destroy();
  });

  it('restores to the current trigger when the captured trigger disconnects after a rebind', () => {
    const originalTrigger = document.createElement('button');
    const currentTrigger = document.createElement('button');
    const content = document.createElement('div');
    const action = document.createElement('button');
    content.append(action);
    document.body.append(originalTrigger, currentTrigger, content);
    visible(action);
    originalTrigger.focus();
    const dialog = createDialog({ initialFocus: () => action });
    dialog.bind({ trigger: originalTrigger, content });
    dialog.open();
    dialog.bind({ trigger: currentTrigger, content });
    originalTrigger.remove();

    dialog.close();

    expect(document.activeElement).toBe(currentTrigger);
    dialog.destroy();
  });

  it('does not let restore fallback steal focus from a reentrant open session', () => {
    const originalTrigger = document.createElement('button');
    const currentTrigger = document.createElement('button');
    const content = document.createElement('div');
    const action = document.createElement('button');
    content.append(action);
    document.body.append(originalTrigger, currentTrigger, content);
    visible(action);
    originalTrigger.focus();
    const dialog = createDialog({ initialFocus: () => action });
    dialog.bind({ trigger: originalTrigger, content });
    dialog.open();
    dialog.bind({ trigger: currentTrigger, content });
    originalTrigger.addEventListener(
      'focus',
      () => {
        dialog.open();
      },
      { once: true },
    );

    dialog.close();

    expect(dialog.getSnapshot().open).toBe(true);
    expect(document.activeElement).toBe(action);
    dialog.destroy();
  });

  it('revalidates an open session after reentrant initial-focus callbacks', () => {
    const trigger = document.createElement('button');
    const firstContent = document.createElement('div');
    const firstAction = document.createElement('button');
    const replacementContent = document.createElement('div');
    const replacementAction = document.createElement('button');
    firstContent.append(firstAction);
    replacementContent.append(replacementAction);
    document.body.append(trigger, firstContent, replacementContent);
    visible(firstAction);
    visible(replacementAction);
    trigger.focus();
    let shouldRebind = true;
    let dialog = createDialog({
      initialFocus() {
        if (shouldRebind) {
          shouldRebind = false;
          dialog.bind({ trigger, content: replacementContent });
          return firstAction;
        }
        return replacementAction;
      },
    });
    dialog.bind({ trigger, content: firstContent });
    dialog.open();
    expect(dialog.getSnapshot().open).toBe(true);
    expect(document.activeElement).toBe(replacementAction);
    dialog.destroy();

    trigger.focus();
    dialog = createDialog({
      initialFocus() {
        dialog.close();
        return firstAction;
      },
    });
    dialog.bind({ trigger, content: firstContent });
    dialog.open();
    expect(dialog.getSnapshot().open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(firstContent.hasAttribute('tabindex')).toBe(false);

    trigger.focus();
    dialog = createDialog({
      initialFocus() {
        dialog.destroy();
        return firstAction;
      },
    });
    dialog.bind({ trigger, content: firstContent });
    dialog.open();
    expect(document.activeElement).toBe(trigger);
  });

  it('does not focus a parent whose initial-focus resolver opens a higher overlay', () => {
    const parentContent = document.createElement('div');
    const parentAction = document.createElement('button');
    const childContent = document.createElement('div');
    const childAction = document.createElement('button');
    parentContent.append(parentAction);
    childContent.append(childAction);
    document.body.append(parentContent, childContent);
    visible(parentAction);
    visible(childAction);
    const child = createDialog({ initialFocus: () => childAction });
    child.bind({ content: childContent });
    const parent = createDialog({
      initialFocus() {
        child.open();
        return parentAction;
      },
    });
    parent.bind({ content: parentContent });

    parent.open();

    expect(parent.getSnapshot()).toMatchObject({ open: true, topmost: false });
    expect(child.getSnapshot()).toMatchObject({ open: true, topmost: true });
    expect(document.activeElement).toBe(childAction);
    child.destroy();
    parent.destroy();
  });

  it('abandons stale open and close lifecycles when snapshot subscribers reverse transitions', () => {
    const trigger = document.createElement('button');
    const content = document.createElement('div');
    const action = document.createElement('button');
    content.append(action);
    document.body.append(trigger, content);
    visible(action);
    trigger.focus();
    const dialog = createDialog({ initialFocus: () => action });
    dialog.bind({ trigger, content });
    const opened = vi.fn();
    const afterOpened = vi.fn();
    const closed = vi.fn();
    const afterClosed = vi.fn();
    dialog.on('open', opened);
    dialog.on('afterOpen', afterOpened);
    dialog.on('close', closed);
    dialog.on('afterClose', afterClosed);
    let reverseOpen = true;
    const releaseOpenReversal = dialog.subscribe((snapshot) => {
      if (reverseOpen && snapshot.open) {
        reverseOpen = false;
        dialog.close();
      }
    });

    dialog.open();
    expect(dialog.getSnapshot()).toMatchObject({ open: false, topmost: false });
    expect(opened).not.toHaveBeenCalled();
    expect(afterOpened).not.toHaveBeenCalled();
    expect(closed).toHaveBeenCalledOnce();
    expect(afterClosed).toHaveBeenCalledOnce();
    expect(document.documentElement.style.overflow).toBe('');
    releaseOpenReversal();

    dialog.open();
    expect(document.activeElement).toBe(action);
    opened.mockClear();
    afterOpened.mockClear();
    closed.mockClear();
    afterClosed.mockClear();
    let reverseClose = true;
    const releaseCloseReversal = dialog.subscribe((snapshot) => {
      if (reverseClose && !snapshot.open) {
        reverseClose = false;
        dialog.open();
      }
    });
    dialog.close();
    expect(dialog.getSnapshot()).toMatchObject({ open: true, topmost: true });
    expect(closed).not.toHaveBeenCalled();
    expect(afterClosed).not.toHaveBeenCalled();
    expect(opened).toHaveBeenCalledOnce();
    expect(afterOpened).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(action);
    releaseCloseReversal();
    dialog.close();
    expect(document.activeElement).toBe(trigger);
    dialog.destroy();
  });

  it('ignores same-direction commands issued during their own cancellable lifecycle', () => {
    const popover = createPopover();
    const beforeOpen = vi.fn(() => {
      popover.open();
      popover.toggle();
    });
    const beforeClose = vi.fn(() => {
      popover.close();
      popover.toggle();
    });
    const opened = vi.fn();
    const closed = vi.fn();
    popover.on('beforeOpen', beforeOpen);
    popover.on('beforeClose', beforeClose);
    popover.on('open', opened);
    popover.on('close', closed);

    popover.open();
    expect(popover.getSnapshot().open).toBe(true);
    expect(beforeOpen).toHaveBeenCalledOnce();
    expect(opened).toHaveBeenCalledOnce();

    popover.close();
    expect(popover.getSnapshot().open).toBe(false);
    expect(beforeClose).toHaveBeenCalledOnce();
    expect(closed).toHaveBeenCalledOnce();
    popover.destroy();
  });

  it('stabilizes stack membership when a topmost publication closes its predecessor', () => {
    const parentContent = document.createElement('div');
    const childContent = document.createElement('div');
    document.body.append(parentContent, childContent);
    const parent = createPopover();
    const child = createPopover();
    parent.bind({ content: parentContent });
    child.bind({ content: childContent });
    parent.open();
    let closeParent = true;
    parent.subscribe((snapshot) => {
      if (closeParent && snapshot.open && !snapshot.topmost) {
        closeParent = false;
        parent.close();
      }
    });

    child.open();
    expect(parent.getSnapshot()).toMatchObject({ open: false, topmost: false });
    expect(child.getSnapshot()).toMatchObject({ open: true, topmost: true });
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    expect(child.getSnapshot()).toMatchObject({ open: false, topmost: false });
    child.destroy();
    parent.destroy();
  });

  it('extends a modal focus and inert scope through a portalled non-trapping overlay', () => {
    const app = document.createElement('main');
    const parentPortal = document.createElement('div');
    const childPortal = document.createElement('div');
    const parentTrigger = document.createElement('button');
    const parentContent = document.createElement('div');
    const parentFirst = document.createElement('button');
    const parentLast = document.createElement('button');
    const childContent = document.createElement('div');
    const childFirst = document.createElement('button');
    const childLast = document.createElement('button');
    app.append(parentTrigger);
    parentContent.append(parentFirst, parentLast);
    childContent.append(childFirst, childLast);
    parentPortal.append(parentContent);
    childPortal.append(childContent);
    document.body.append(app, parentPortal, childPortal);
    for (const element of [parentFirst, parentLast, childFirst, childLast]) visible(element);
    parentTrigger.focus();

    const parent = createDialog({ initialFocus: () => parentFirst });
    const child = createPopover({ closeOnFocusOutside: false });
    parent.bind({ trigger: parentTrigger, content: parentContent });
    child.bind({ content: childContent });
    parent.open();
    child.open();
    expect(app.inert).toBe(true);
    expect(childPortal.inert).not.toBe(true);
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
    expect(app.inert).not.toBe(true);
    expect(childPortal.inert).not.toBe(true);
    child.destroy();
    parent.destroy();
  });

  it('recognizes a dynamically stacked descendant overlay without an explicit branch', () => {
    const parentContent = document.createElement('div');
    const childContent = document.createElement('div');
    document.body.append(parentContent, childContent);
    const parent = createPopover();
    const child = createPopover();
    parent.bind({ content: parentContent });
    child.bind({ content: childContent });
    parent.open();
    child.open();
    childContent.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(parent.getSnapshot().open).toBe(true);
    child.destroy();
    parent.destroy();
  });

  it('preserves a detached middle overlay session order when a predecessor closes', () => {
    const firstContent = document.createElement('div');
    const middleContent = document.createElement('div');
    const topContent = document.createElement('div');
    document.body.append(firstContent, middleContent, topContent);
    const first = createPopover();
    const middle = createPopover();
    const top = createPopover();
    first.bind({ content: firstContent });
    const releaseMiddle = middle.bind({ content: middleContent });
    top.bind({ content: topContent });
    first.open();
    middle.open();
    top.open();
    expect(top.getSnapshot().topmost).toBe(true);

    releaseMiddle();
    first.close();
    middle.bind({ content: middleContent });
    expect(top.getSnapshot().topmost).toBe(true);
    expect(middle.getSnapshot()).toMatchObject({ open: true, topmost: false });
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    expect(top.getSnapshot().open).toBe(false);
    expect(middle.getSnapshot()).toMatchObject({ open: true, topmost: true });

    top.destroy();
    middle.destroy();
    first.destroy();
  });

  it('does not restore detached middle-dialog focus over a higher open dialog', () => {
    const firstTrigger = document.createElement('button');
    const middleTrigger = document.createElement('button');
    const topTrigger = document.createElement('button');
    const firstContent = document.createElement('div');
    const middleContent = document.createElement('div');
    const topContent = document.createElement('div');
    const firstAction = document.createElement('button');
    const middleAction = document.createElement('button');
    const topAction = document.createElement('button');
    firstContent.append(firstAction);
    middleContent.append(middleAction);
    topContent.append(topAction);
    document.body.append(
      firstTrigger,
      middleTrigger,
      topTrigger,
      firstContent,
      middleContent,
      topContent,
    );
    visible(firstAction);
    visible(middleAction);
    visible(topAction);
    const first = createDialog({ modal: false, initialFocus: () => firstAction });
    const middle = createDialog({ modal: false, initialFocus: () => middleAction });
    const top = createDialog({ modal: false, initialFocus: () => topAction });
    first.bind({ trigger: firstTrigger, content: firstContent });
    const releaseMiddle = middle.bind({ trigger: middleTrigger, content: middleContent });
    top.bind({ trigger: topTrigger, content: topContent });
    first.open();
    middle.open();
    top.open();
    expect(document.activeElement).toBe(topAction);

    releaseMiddle();
    middle.close();
    expect(middle.getSnapshot().open).toBe(false);
    expect(top.getSnapshot()).toMatchObject({ open: true, topmost: true });
    expect(document.activeElement).toBe(topAction);

    top.destroy();
    middle.destroy();
    first.destroy();
  });

  it('supports cancellable controlled popover state, positioning, branches and focus-out', () => {
    let open = false;
    let invalidate: () => void = () => undefined;
    const trigger = document.createElement('button');
    const content = document.createElement('div');
    const branch = document.createElement('div');
    const outside = document.createElement('button');
    document.body.append(trigger, content, branch, outside);
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      x: 10,
      y: 10,
      width: 20,
      height: 10,
      top: 10,
      right: 30,
      bottom: 20,
      left: 10,
      toJSON: () => ({}),
    });
    vi.spyOn(content, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 30,
      height: 20,
      top: 0,
      right: 30,
      bottom: 20,
      left: 0,
      toJSON: () => ({}),
    });
    const popover = createPopover({
      getValue: () => open,
      onValueChange(value) {
        open = value;
      },
      subscribeValue(listener) {
        invalidate = listener;
        return () => undefined;
      },
      positioning: { placement: 'bottom-start', viewportWidth: 100, viewportHeight: 100 },
    });
    popover.bind({ trigger, content, branches: [branch] });
    trigger.focus();
    const cancel = popover.on('beforeOpen', (event) => event.preventDefault());
    popover.open();
    expect(open).toBe(false);
    cancel();
    popover.toggle({ reason: 'trigger' });
    invalidate();
    popover.updatePosition();
    expect(popover.getSnapshot()).toMatchObject({
      open: true,
      controlled: true,
      position: { x: 10, y: 24 },
    });
    expect(document.activeElement).toBe(trigger);
    branch.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(open).toBe(true);
    outside.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    invalidate();
    expect(open).toBe(false);
    popover.destroy();
  });

  it('does not publish controlled overlay lifecycle before the external commit', () => {
    let open = false;
    let notify: () => void = () => undefined;
    const request = vi.fn();
    const popover = createPopover({
      getValue: () => open,
      onValueChange: request,
      subscribeValue(listener) {
        notify = listener;
        return () => undefined;
      },
    });
    const committed = vi.fn();
    popover.on('open', committed);
    popover.open({ reason: 'trigger' });
    expect(request).toHaveBeenCalledWith(true, { reason: 'trigger' });
    expect(popover.getSnapshot().open).toBe(false);
    expect(committed).not.toHaveBeenCalled();

    open = true;
    notify();
    expect(popover.getSnapshot().open).toBe(true);
    expect(committed).toHaveBeenCalledOnce();
    popover.destroy();
  });
});

describe('Tooltip timers and scope', () => {
  it('opens on hover/focus, ignores touch, coordinates scope and cleans pending timers', () => {
    vi.useFakeTimers();
    const triggerA = document.createElement('button');
    const contentA = document.createElement('div');
    const triggerB = document.createElement('button');
    const contentB = document.createElement('div');
    document.body.append(triggerA, contentA, triggerB, contentB);
    const first = createTooltip({ id: 'first', openDelay: 50, closeDelay: 25, scope: 'shared' });
    const second = createTooltip({ id: 'second', openDelay: 0, scope: 'shared' });
    const unsubscribe = first.subscribe(vi.fn());
    first.bind(triggerA, contentA);
    second.bind(triggerB, contentB);
    triggerA.dispatchEvent(
      new PointerEvent('pointerenter', { bubbles: true, pointerType: 'touch' }),
    );
    vi.advanceTimersByTime(100);
    expect(first.getSnapshot().open).toBe(false);
    first.scheduleOpen('hover');
    vi.advanceTimersByTime(50);
    expect(first.getSnapshot()).toMatchObject({
      open: true,
      ariaDescribedby: 'first-content',
      role: 'tooltip',
    });
    expect(document.activeElement).not.toBe(contentA);
    triggerA.dispatchEvent(
      new PointerEvent('pointerleave', { bubbles: true, pointerType: 'mouse' }),
    );
    triggerA.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    second.scheduleOpen('focus');
    expect(first.getSnapshot().open).toBe(false);
    expect(second.getSnapshot().open).toBe(true);
    second.scheduleClose('hover');
    vi.advanceTimersByTime(100);
    expect(second.getSnapshot().open).toBe(false);
    first.scheduleOpen();
    unsubscribe();
    first.destroy();
    first.subscribe(vi.fn())();
    vi.runAllTimers();
    expect(first.getSnapshot().open).toBe(false);
    second.destroy();
    const active = createTooltip({ openDelay: 0, scope: 'destroy-active' });
    active.subscribe(vi.fn());
    active.scheduleOpen();
    active.destroy();
    active.scheduleClose();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not let stale binding cleanup dispose a newer trigger binding', () => {
    vi.useFakeTimers();
    const firstTrigger = document.createElement('button');
    const firstContent = document.createElement('div');
    const nextTrigger = document.createElement('button');
    const nextContent = document.createElement('div');
    document.body.append(firstTrigger, firstContent, nextTrigger, nextContent);
    const tooltip = createTooltip({ openDelay: 0 });
    const releaseFirst = tooltip.bind(firstTrigger, firstContent);
    tooltip.bind(nextTrigger, nextContent);
    releaseFirst();
    nextTrigger.dispatchEvent(
      new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }),
    );
    expect(tooltip.getSnapshot().open).toBe(true);
    tooltip.destroy();
  });
});

describe('Toast queue', () => {
  it('publishes an authoritative controlled queue initially and advances its sequence', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    let records: readonly ToastRecord[] = [
      Object.freeze({
        id: 'existing',
        message: 'Existing notification',
        status: 'info',
        priority: 0,
        politeness: 'polite',
        duration: 100,
        paused: false,
        sequence: 7,
      }),
    ];
    const toast = createToast({
      getToasts: () => records,
      onToastsChange(next) {
        records = next;
      },
    });

    expect(toast.getSnapshot()).toMatchObject({ controlled: true, all: [{ id: 'existing' }] });
    toast.show({ id: 'next', message: 'Next notification', duration: null });
    expect(toast.getSnapshot().all.find((record) => record.id === 'next')?.sequence).toBe(8);
    vi.advanceTimersByTime(100);
    expect(toast.getSnapshot().all.map((record) => record.id)).toEqual(['next']);

    toast.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('orders, deduplicates, limits, updates, pauses, resumes and times out', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const toast = createToast({ maxVisible: 2 });
    const low = toast.show({ id: 'low', message: 'Low', priority: 0, duration: 1000 });
    toast.show({ id: 'high', message: 'High', priority: 10, duration: null });
    toast.show({ id: 'mid', message: 'Mid', priority: 5, duration: null });
    expect(toast.getSnapshot().visible.map((item) => item.id)).toEqual(['high', 'mid']);
    expect(toast.getSnapshot().queued.map((item) => item.id)).toEqual(['low']);
    toast.show({ id: 'low', message: 'Updated', status: 'success' });
    expect(toast.getSnapshot().all.find((item) => item.id === low)?.message).toBe('Updated');
    toast.pause(low);
    vi.advanceTimersByTime(500);
    expect(toast.getSnapshot().all.some((item) => item.id === low)).toBe(true);
    toast.resume(low);
    vi.advanceTimersByTime(5000);
    expect(toast.getSnapshot().all.some((item) => item.id === low)).toBe(false);
    toast.dismiss('missing');
    toast.dismiss('mid');
    expect(toast.getSnapshot().all.some((item) => item.id === 'mid')).toBe(false);
    toast.destroy();
    toast.destroy();
  });

  it('supports cancellable show and promise success/rejection without replacing original errors', async () => {
    vi.useFakeTimers();
    const toast = createToast();
    const cancel = toast.on('beforeShow', (event) => event.preventDefault());
    toast.show({ message: 'Nope' });
    expect(toast.getSnapshot().all).toEqual([]);
    cancel();
    const reasons: string[] = [];
    toast.on('update', (event) => reasons.push(event.detail.details.reason));
    const resolved = toast.promise(Promise.resolve(42), {
      loading: 'Loading',
      success: (value) => `Done ${value}`,
      error: 'Failed',
    });
    await expect(resolved).resolves.toBe(42);
    expect(toast.getSnapshot().all[0]).toMatchObject({ message: 'Done 42', status: 'success' });
    const original = new Error('original');
    const rejected = toast.promise(Promise.reject(original), {
      loading: 'Loading 2',
      success: 'Done',
      error: (error) => (error instanceof Error ? error.message : 'unknown'),
    });
    await expect(rejected).rejects.toBe(original);
    expect(toast.getSnapshot().all.find((item) => item.status === 'error')).toMatchObject({
      message: 'original',
      politeness: 'assertive',
    });
    expect(reasons).toEqual(['promise', 'promise']);
    toast.destroy();
    toast.show({ message: 'After destroy', duration: 10 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('pauses rendered toasts for pointer and focus interactions with scoped cleanup', () => {
    vi.useFakeTimers();
    const toast = createToast();
    toast.show({ id: 'interactive', message: 'Interactive', duration: 100 });
    const element = document.createElement('div');
    const child = document.createElement('button');
    element.append(child);
    document.body.append(element);
    const release = toast.bindPause('interactive', element);
    element.dispatchEvent(new FocusEvent('focusin'));
    element.dispatchEvent(new PointerEvent('pointerenter'));
    expect(toast.getSnapshot().all[0]?.paused).toBe(true);
    vi.advanceTimersByTime(500);
    expect(toast.getSnapshot().all).toHaveLength(1);
    element.dispatchEvent(new FocusEvent('focusout', { relatedTarget: child }));
    expect(toast.getSnapshot().all[0]?.paused).toBe(true);
    element.dispatchEvent(new PointerEvent('pointerleave'));
    expect(toast.getSnapshot().all[0]?.paused).toBe(false);
    release();
    element.dispatchEvent(new PointerEvent('pointerenter'));
    expect(toast.getSnapshot().all[0]?.paused).toBe(false);
    vi.advanceTimersByTime(100);
    expect(toast.getSnapshot().all).toEqual([]);
    toast.show({ id: 'persistent', message: 'Persistent', duration: null });
    toast.pause('persistent');
    toast.resume('persistent');
    toast.pause('missing');
    toast.resume('missing');
    toast.update('missing', { message: 'Missing' });
    toast.destroy();
    expect(toast.bindPause('persistent', element)()).toBeUndefined();
  });

  it('does not publish controlled Toast mutations until the external queue commits', () => {
    let records: readonly ToastRecord[] = [];
    let notify: () => void = () => undefined;
    const request = vi.fn((next: readonly ToastRecord[]) => next);
    const toast = createToast({
      getToasts: () => records,
      onToastsChange: request,
      subscribeToasts(listener) {
        notify = listener;
        return () => undefined;
      },
    });
    const shown = vi.fn();
    toast.on('show', shown);
    toast.show({ id: 'controlled', message: 'Controlled', duration: null });
    expect(toast.getSnapshot().all).toEqual([]);
    expect(shown).not.toHaveBeenCalled();
    records = request.mock.calls[0]?.[0] ?? [];
    notify();
    expect(toast.getSnapshot().all[0]?.id).toBe('controlled');
    expect(shown).toHaveBeenCalledOnce();
    toast.destroy();
  });
});

describe('Combobox async and input behavior', () => {
  it('uses authoritative controlled input and selection for its initial query and filtering', () => {
    const combobox = createCombobox({
      defaultInputValue: 'fallback',
      defaultSelectedValue: null,
      getInputValue: () => 'Ada',
      getSelectedValue: () => 'ada',
      filter: (option, query) => option.text.startsWith(query),
    });
    combobox.registerOption({ id: 'ada', text: 'Ada Lovelace', value: 'ada' });
    combobox.registerOption({ id: 'grace', text: 'Grace Hopper', value: 'grace' });

    expect(combobox.getSnapshot()).toMatchObject({
      inputControlled: true,
      selectionControlled: true,
      inputValue: 'Ada',
      query: 'Ada',
      selectedValue: 'ada',
      options: [{ id: 'ada' }],
    });

    combobox.destroy();
  });

  it('filters, navigates, selects, handles composition and ignores stale async responses', async () => {
    const resolvers = new Map<
      string,
      (options: readonly { id: string; text: string; value: string }[]) => void
    >();
    const combobox = createCombobox({
      id: 'people',
      loadOptions(query) {
        return new Promise((resolve) => resolvers.set(query, resolve));
      },
    });
    combobox.registerOption({ id: 'ada', text: 'Ada Lovelace', value: 'ada' });
    combobox.registerOption({ id: 'grace', text: 'Grace Hopper', value: 'grace', disabled: true });
    combobox.setInputValue('ad', { reason: 'input' });
    const older = combobox.refresh();
    combobox.setInputValue('ali', { reason: 'input' });
    const newer = combobox.refresh();
    resolvers.get('ali')?.([{ id: 'alice', text: 'Alice', value: 'alice' }]);
    await newer;
    resolvers.get('ad')?.([{ id: 'old', text: 'Old response', value: 'old' }]);
    await older;
    expect(combobox.getSnapshot().options.map((option) => option.id)).toContain('alice');
    expect(combobox.getSnapshot().options.map((option) => option.id)).not.toContain('old');
    combobox.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    combobox.select('alice', { reason: 'keyboard' });
    expect(combobox.getSnapshot()).toMatchObject({
      selectedValue: 'alice',
      inputValue: 'Alice',
      open: false,
    });
    combobox.handleCompositionStart();
    expect(combobox.getSnapshot().composing).toBe(true);
    const input = document.createElement('input');
    input.value = '日本';
    const composition = new CompositionEvent('compositionend');
    Object.defineProperty(composition, 'target', { value: input });
    combobox.handleCompositionEnd(composition);
    expect(combobox.getSnapshot().query).toBe('日本');
    combobox.handleKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));
    combobox.destroy();
  });

  it('supports controlled input and selection callbacks', () => {
    let inputValue = '';
    let selectedValue: string | null = null;
    const combobox = createCombobox({
      getInputValue: () => inputValue,
      onInputValueChange(value) {
        inputValue = value;
      },
      getSelectedValue: () => selectedValue,
      onSelectedValueChange(value) {
        selectedValue = value;
      },
    });
    combobox.registerOption({ id: 'one', text: 'One', value: '1' });
    const input = document.createElement('input');
    input.value = 'O';
    const event = new InputEvent('input');
    Object.defineProperty(event, 'target', { value: input });
    combobox.handleInput(event);
    combobox.select('one');
    expect(inputValue).toBe('One');
    expect(selectedValue).toBe('1');
    expect(combobox.getSnapshot()).toMatchObject({
      inputControlled: true,
      selectionControlled: true,
    });
    combobox.destroy();
  });

  it('keeps rejected controlled Combobox input and selection authoritative', () => {
    const inputRequest = vi.fn<(value: string) => void>();
    const selectionRequest = vi.fn<(value: string | null) => void>();
    const combobox = createCombobox({
      getInputValue: () => '',
      onInputValueChange: inputRequest,
      getSelectedValue: () => null,
      onSelectedValueChange: selectionRequest,
    });
    combobox.registerOption({ id: 'one', text: 'One', value: '1' });
    const queryChanged = vi.fn();
    combobox.on('queryChange', queryChanged);
    combobox.setInputValue('One', { reason: 'input' });
    combobox.select('one');
    expect(inputRequest).toHaveBeenCalled();
    expect(selectionRequest).toHaveBeenCalledWith('1', { reason: 'programmatic' });
    expect(combobox.getSnapshot()).toMatchObject({ inputValue: '', selectedValue: null });
    expect(queryChanged).not.toHaveBeenCalled();
    combobox.destroy();
  });

  it('does not attribute a later external Combobox value to a superseded request', () => {
    let selectedValue: string | null = null;
    let notifySelection: () => void = () => undefined;
    const selectionRequest = vi.fn<(value: string | null) => void>();
    const combobox = createCombobox({
      getSelectedValue: () => selectedValue,
      onSelectedValueChange: selectionRequest,
      subscribeSelectedValue(listener) {
        notifySelection = listener;
        return () => undefined;
      },
    });
    combobox.registerOption({ id: 'alpha', text: 'Alpha', value: 'a' });
    combobox.registerOption({ id: 'beta', text: 'Beta', value: 'b' });
    const selected = vi.fn();
    const queryChanged = vi.fn();
    combobox.on('select', selected);
    combobox.on('queryChange', queryChanged);

    combobox.select('alpha', { reason: 'keyboard' });
    expect(selectionRequest).toHaveBeenCalledWith('a', { reason: 'keyboard' });
    selectedValue = 'b';
    notifySelection();
    selectedValue = 'a';
    notifySelection();

    expect(combobox.getSnapshot()).toMatchObject({
      selectedValue: 'a',
      inputValue: '',
      query: '',
    });
    expect(selected).not.toHaveBeenCalled();
    expect(queryChanged).not.toHaveBeenCalled();
    combobox.destroy();
  });

  it('commits subscribed Combobox stores, preserves replacement registrations, and handles input edges', () => {
    let inputValue = '';
    let selectedValue: string | null = null;
    let notifyInput: () => void = () => undefined;
    let notifySelection: () => void = () => undefined;
    const inputRequest = vi.fn<(value: string) => void>();
    const selectionRequest = vi.fn<(value: string | null) => void>();
    const combobox = createCombobox({
      getInputValue: () => inputValue,
      onInputValueChange: inputRequest,
      subscribeInputValue(listener) {
        notifyInput = listener;
        return () => undefined;
      },
      getSelectedValue: () => selectedValue,
      onSelectedValueChange: selectionRequest,
      subscribeSelectedValue(listener) {
        notifySelection = listener;
        return () => undefined;
      },
      filter: (option, query) => option.text.toLowerCase().startsWith(query.toLowerCase()),
    });
    const stale = combobox.registerOption({ id: 'item', text: 'Old', value: 'item' });
    const current = combobox.registerOption({ id: 'item', text: 'Item', value: 'item' });
    stale();
    expect(combobox.getSnapshot().options).toEqual([
      expect.objectContaining({ id: 'item', text: 'Item', value: 'item' }),
    ]);
    inputValue = 'External';
    notifyInput();
    selectedValue = 'external-selection';
    notifySelection();
    combobox.setInputValue('It', { reason: 'input' });
    inputValue = inputRequest.mock.calls.at(-1)?.[0] ?? '';
    notifyInput();
    expect(combobox.getSnapshot().query).toBe('It');
    combobox.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    combobox.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    const div = document.createElement('div');
    const invalidInput = new InputEvent('input');
    Object.defineProperty(invalidInput, 'target', { value: div });
    combobox.handleInput(invalidInput);
    combobox.handleCompositionStart();
    const invalidComposition = new CompositionEvent('compositionend');
    Object.defineProperty(invalidComposition, 'target', { value: div });
    combobox.handleCompositionEnd(invalidComposition);
    combobox.select('item', {
      reason: 'keyboard',
      event: new KeyboardEvent('keydown', { key: 'Enter' }),
    });
    selectedValue = selectionRequest.mock.calls.at(-1)?.[0] ?? null;
    notifySelection();
    expect(combobox.getSnapshot().selectedValue).toBe('item');
    current();
    current();
    combobox.destroy();

    const closed = createCombobox();
    const cancelOpen = closed.on('beforeOpen', (event) => event.preventDefault());
    closed.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    expect(closed.getSnapshot().open).toBe(false);
    cancelOpen();
    closed.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    expect(closed.getSnapshot().open).toBe(true);
    closed.destroy();
    closed.handleCompositionEnd(new CompositionEvent('compositionend'));
  });

  it('swallows only AbortError from async Combobox loaders', async () => {
    const aborted = createCombobox({
      loadOptions: () => Promise.reject(new DOMException('cancelled', 'AbortError')),
    });
    await expect(aborted.refresh()).resolves.toBeUndefined();
    aborted.destroy();

    const failed = createCombobox({
      loadOptions: () => Promise.reject(new Error('network failed')),
    });
    await expect(failed.refresh()).rejects.toThrow('network failed');
    failed.destroy();
  });
});
