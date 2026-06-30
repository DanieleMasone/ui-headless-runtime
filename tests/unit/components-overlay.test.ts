import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createCombobox,
  createDialog,
  createPopover,
  createToast,
  createTooltip,
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
});

describe('Combobox async and input behavior', () => {
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
});
