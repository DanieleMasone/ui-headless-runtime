import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  autoUpdatePosition,
  calculatePosition,
  createCollection,
  createControllableValue,
  createDisposableScope,
  createEventEmitter,
  createRuntimeId,
  createTimeoutManager,
  createVirtualAnchor,
  eventTargets,
  findTypeaheadMatch,
  focusById,
  focusInitial,
  fuzzyScore,
  getOwnerDocument,
  getOwnerWindow,
  getScrollableAncestors,
  getTabbableElements,
  hasDOM,
  inertSiblings,
  listen,
  lockDocumentScroll,
  normalizeText,
  observeOutsideInteraction,
  restoreFocus,
  trapFocus,
  type RuntimeEvent,
} from '../../packages/ui-headless-runtime/src/index';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('core resource ownership and events', () => {
  it('replaces and clears managed timeouts without leaking re-entrant schedules', () => {
    vi.useFakeTimers();
    const timeout = createTimeoutManager();
    const calls: string[] = [];
    timeout.schedule(() => calls.push('stale'), 10);
    timeout.schedule(() => {
      calls.push('current');
      timeout.schedule(() => calls.push('reentrant'), 5);
    }, 20);
    expect(timeout.pending).toBe(true);
    vi.advanceTimersByTime(20);
    expect(calls).toEqual(['current']);
    vi.advanceTimersByTime(5);
    expect(calls).toEqual(['current', 'reentrant']);
    timeout.clear();
    timeout.clear();
    expect(timeout.pending).toBe(false);
  });

  it('disposes resources once in reverse order and disposes late additions immediately', () => {
    const calls: number[] = [];
    const scope = createDisposableScope();
    const first = scope.add(() => calls.push(1));
    scope.add(() => calls.push(2));
    first();
    first();
    scope.dispose();
    scope.dispose();
    scope.add(() => calls.push(3));
    expect(calls).toEqual([1, 2, 3]);
    expect(scope.disposed).toBe(true);
  });

  it('continues reverse cleanup after errors and reports every failure', () => {
    const calls: number[] = [];
    const scope = createDisposableScope();
    scope.add(() => {
      calls.push(1);
      throw new Error('first');
    });
    scope.add(() => {
      calls.push(2);
      throw new Error('second');
    });
    expect(() => scope.dispose()).toThrow(AggregateError);
    expect(calls).toEqual([2, 1]);
    expect(scope.disposed).toBe(true);
    const single = createDisposableScope();
    const failure = new Error('single');
    single.add(() => {
      throw failure;
    });
    expect(() => single.dispose()).toThrow(failure);
  });

  it('supports deterministic on/off/once, cancellation, and listener mutation', () => {
    type Events = { change: { value: number } };
    const emitter = createEventEmitter<Events>();
    const calls: number[] = [];
    const later = vi.fn();
    const listener = vi.fn((event: RuntimeEvent<{ value: number }>) => {
      calls.push(event.detail.value);
      expect(event.defaultPrevented).toBe(false);
      event.preventDefault();
      expect(event.defaultPrevented).toBe(true);
      emitter.on('change', later);
    });
    emitter.on('change', listener);
    emitter.once('change', (event) => calls.push(event.detail.value * 10));
    expect(emitter.emit('change', { value: 2 })).toBe(false);
    expect(later).not.toHaveBeenCalled();
    expect(emitter.emit('change', { value: 3 })).toBe(false);
    expect(later).toHaveBeenCalledOnce();
    emitter.off('change', listener);
    emitter.clear();
    expect(emitter.emit('change', { value: 4 })).toBe(true);
    expect(calls).toEqual([2, 20, 3]);
    const isolated = createEventEmitter<Events>();
    const isolatedListener = vi.fn();
    const remove = isolated.on('change', isolatedListener);
    remove();
    remove();
    isolated.on('change', isolatedListener);
    isolated.off('change', isolatedListener);
  });

  it('runs uncontrolled, controlled, external, duplicate, and re-entrant value transitions', () => {
    const changes: number[] = [];
    const cell = createControllableValue(
      {
        defaultValue: 1,
        onValueChange(value) {
          changes.push(value);
          if (value === 2) cell.set(3, { reason: 'set' });
        },
      },
      vi.fn(),
    );
    expect(cell.set(1, { reason: 'set' })).toBe(false);
    expect(cell.set(2, { reason: 'set' })).toBe(true);
    expect(cell.get()).toBe(3);
    expect(changes).toEqual([2, 3]);
    cell.destroy();
    expect(cell.set(4, { reason: 'set' })).toBe(false);

    let external = 5;
    let invalidate: () => void = () => undefined;
    const unsubscribe = vi.fn();
    const controlledChanges: number[] = [];
    const controlled = createControllableValue(
      {
        defaultValue: 0,
        getValue: () => external,
        onValueChange(value) {
          controlledChanges.push(value);
          external = value;
        },
        subscribeValue(listener) {
          invalidate = listener;
          return unsubscribe;
        },
      },
      vi.fn(),
    );
    expect(controlled.controlled).toBe(true);
    expect(controlled.set(6, { reason: 'set' })).toBe(true);
    invalidate();
    expect(controlled.get()).toBe(6);
    controlled.destroy();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('treats null and undefined as authoritative and waits for controlled commits', () => {
    let nullable: string | null = null;
    const nullableCell = createControllableValue<string | null, 'set'>(
      { defaultValue: 'fallback', getValue: () => nullable },
      vi.fn(),
    );
    expect(nullableCell.get()).toBeNull();

    const external: { optional?: string } = {};
    let notify: () => void = () => undefined;
    const observed = vi.fn();
    const optionalCell = createControllableValue<string | undefined, 'set'>(
      {
        defaultValue: 'fallback',
        getValue: () => external.optional,
        onValueChange: vi.fn(),
        subscribeValue(listener) {
          notify = listener;
          listener();
          return () => undefined;
        },
      },
      observed,
    );
    expect(optionalCell.get()).toBeUndefined();
    expect(optionalCell.set('accepted', { reason: 'set' })).toBe(false);
    expect(observed).not.toHaveBeenCalled();
    external.optional = 'accepted';
    notify();
    expect(observed).toHaveBeenCalledWith('accepted', { reason: 'set' });
    nullable = 'next';
    expect(nullableCell.get()).toBe('next');
    nullableCell.destroy();
    optionalCell.destroy();
  });

  it('restores controllable update state when a change callback throws', () => {
    let shouldThrow = true;
    const cell = createControllableValue<number, 'set'>(
      {
        defaultValue: 0,
        onValueChange() {
          if (shouldThrow) throw new Error('change failed');
        },
      },
      vi.fn(),
    );
    expect(() => cell.set(1, { reason: 'set' })).toThrow('change failed');
    shouldThrow = false;
    expect(cell.set(2, { reason: 'set' })).toBe(true);
    expect(cell.get()).toBe(2);
    cell.destroy();
  });

  it('separates unrelated external commits from pending controlled requests', () => {
    let external = 0;
    let notify: () => void = () => undefined;
    const observed = vi.fn();
    const cell = createControllableValue<number, 'set'>(
      {
        defaultValue: -1,
        getValue: () => external,
        onValueChange: vi.fn(),
        subscribeValue(listener) {
          notify = listener;
          return () => undefined;
        },
      },
      observed,
    );
    expect(cell.set(1, { reason: 'set' })).toBe(false);
    external = 2;
    notify();
    expect(observed).toHaveBeenLastCalledWith(2, undefined);
    notify();
    expect(observed).toHaveBeenCalledOnce();
    cell.destroy();
    cell.destroy();
    external = 3;
    notify();
    expect(observed).toHaveBeenCalledOnce();
    expect(cell.set(4, { reason: 'set' })).toBe(false);
  });
});

describe('collections and matching', () => {
  it('supports dynamic replacement, safe cleanup, movement, and edges', () => {
    const collection = createCollection<{ id: string; text: string; disabled?: boolean }>();
    const stale = collection.register({ id: 'a', text: 'Alpha' });
    const current = collection.register({ id: 'a', text: 'Actual' });
    collection.register({ id: 'b', text: 'Beta', disabled: true });
    collection.register({ id: 'c', text: 'Café' });
    stale();
    expect(collection.get('a')?.text).toBe('Actual');
    expect(collection.edge('first')).toBe('a');
    expect(collection.edge('last')).toBe('c');
    expect(collection.move('a', 1)).toBe('c');
    expect(collection.move('missing', 1)).toBe('a');
    expect(collection.move('c', 1, false)).toBeUndefined();
    expect(collection.move(undefined, -1)).toBe('c');
    current();
    expect(collection.get('a')).toBeUndefined();
    collection.clear();
    expect(collection.items()).toEqual([]);
  });

  it('normalizes diacritics and performs cyclic typeahead and fuzzy scoring', () => {
    const items = [
      { id: 'a', text: 'Álpha' },
      { id: 'b', text: 'Beta', disabled: true },
      { id: 'c', text: 'Alpine' },
    ];
    expect(normalizeText('  CÁFÉ ')).toBe('cafe');
    expect(findTypeaheadMatch(items, 'al', 'a')).toBe('c');
    expect(findTypeaheadMatch(items, 'be')).toBeUndefined();
    expect(findTypeaheadMatch(items, '')).toBeUndefined();
    expect(fuzzyScore('Command Palette', 'cmd')).toBeGreaterThan(Number.NEGATIVE_INFINITY);
    expect(fuzzyScore('Alpha', '')).toBe(0);
    expect(fuzzyScore('Alpha', 'zzz')).toBe(Number.NEGATIVE_INFINITY);
  });
});

describe('positioning', () => {
  const anchor = { x: 40, y: 40, width: 20, height: 10 };
  const floating = { width: 30, height: 20 };

  it('calculates sides, alignments, RTL, flipping and shifting', () => {
    expect(
      calculatePosition(anchor, floating, {
        placement: 'bottom-start',
        viewportWidth: 200,
        viewportHeight: 200,
        flip: false,
        shift: false,
      }),
    ).toMatchObject({ x: 40, y: 54 });
    expect(
      calculatePosition(anchor, floating, {
        placement: 'top-end',
        rtl: true,
        viewportWidth: 200,
        viewportHeight: 200,
        flip: false,
        shift: false,
      }).x,
    ).toBe(40);
    expect(
      calculatePosition(anchor, floating, {
        placement: 'right-end',
        viewportWidth: 200,
        viewportHeight: 200,
        flip: false,
        shift: false,
      }),
    ).toMatchObject({ x: 64, y: 30 });
    expect(
      calculatePosition(anchor, floating, {
        placement: 'left-start',
        viewportWidth: 200,
        viewportHeight: 200,
        flip: false,
        shift: false,
      }),
    ).toMatchObject({ x: 6, y: 40 });
    const flipped = calculatePosition({ x: 40, y: 1, width: 20, height: 10 }, floating, {
      placement: 'top',
      viewportWidth: 100,
      viewportHeight: 100,
    });
    expect(flipped.flipped).toBe(true);
    const shifted = calculatePosition({ x: -30, y: 30, width: 5, height: 5 }, floating, {
      placement: 'bottom-start',
      viewportWidth: 80,
      viewportHeight: 80,
      flip: false,
    });
    expect(shifted.shifted).toBe(true);
    expect(shifted.x).toBe(8);
    expect(
      calculatePosition(anchor, floating, {
        placement: 'bottom-end',
        viewportWidth: 200,
        viewportHeight: 200,
        flip: false,
        shift: false,
      }).x,
    ).toBe(30);
    expect(
      calculatePosition(anchor, floating, {
        placement: 'left-end',
        viewportWidth: 200,
        viewportHeight: 200,
        flip: false,
        shift: false,
      }).y,
    ).toBe(30);
    expect(calculatePosition(anchor, floating).placement).toBe('bottom-start');
  });

  it('creates point anchors and auto-update cleanup', () => {
    const anchorElement = document.createElement('button');
    const floatingElement = document.createElement('div');
    document.body.append(anchorElement, floatingElement);
    const virtual = createVirtualAnchor(10, 20, anchorElement);
    expect(virtual.getBoundingClientRect()).toEqual({ x: 10, y: 20, width: 0, height: 0 });
    const update = vi.fn();
    const cleanup = autoUpdatePosition(virtual, floatingElement, update);
    window.dispatchEvent(new Event('resize'));
    expect(update).toHaveBeenCalledTimes(2);
    const withoutContext = createVirtualAnchor(1, 2);
    expect(withoutContext.contextElement).toBeUndefined();
    const detachedDocument = document.implementation.createHTMLDocument('detached');
    const detachedFloating = detachedDocument.createElement('div');
    const detachedUpdate = vi.fn();
    autoUpdatePosition(withoutContext, detachedFloating, detachedUpdate)();
    expect(detachedUpdate).toHaveBeenCalledOnce();
    class ResizeObserverStub {
      static observed: Element[] = [];
      observe(element: Element): void {
        ResizeObserverStub.observed.push(element);
      }
      disconnect(): void {
        ResizeObserverStub.observed = [];
      }
    }
    Object.defineProperty(window, 'ResizeObserver', {
      value: ResizeObserverStub,
      configurable: true,
    });
    const observedCleanup = autoUpdatePosition(anchorElement, floatingElement, vi.fn());
    expect(ResizeObserverStub.observed).toEqual([anchorElement, floatingElement]);
    observedCleanup();
    expect(ResizeObserverStub.observed).toEqual([]);
    expect(
      calculatePosition(anchor, floating, {
        placement: 'top',
        rtl: true,
        viewportWidth: 200,
        viewportHeight: 200,
      }).placement,
    ).toBe('top');
    cleanup();
    window.dispatchEvent(new Event('resize'));
    expect(update).toHaveBeenCalledTimes(2);
  });
});

describe('DOM and focus utilities', () => {
  it('keeps imports DOM-aware only at invocation and owns listeners', () => {
    expect(hasDOM()).toBe(true);
    expect(getOwnerDocument()).toBe(document);
    expect(getOwnerWindow(document)).toBe(window);
    expect(getOwnerWindow(document.body)).toBe(window);
    const detachedDocument = document.implementation.createHTMLDocument('detached');
    expect(getOwnerWindow(detachedDocument)).toBeUndefined();
    const button = document.createElement('button');
    document.body.append(button);
    expect(getOwnerDocument(button)).toBe(document);
    const click = vi.fn();
    const cleanup = listen<MouseEvent>(button, 'click', click);
    button.click();
    cleanup();
    cleanup();
    button.click();
    expect(click).toHaveBeenCalledOnce();
    const event = new Event('custom', { bubbles: true, composed: true });
    button.dispatchEvent(event);
    expect(eventTargets(event, button)).toBe(true);
  });

  it('observes outside pointer and focus and includes declared branches', () => {
    const boundary = document.createElement('div');
    const branch = document.createElement('button');
    const outside = document.createElement('button');
    document.body.append(boundary, branch, outside);
    const pointer = vi.fn();
    const focus = vi.fn();
    const cleanup = observeOutsideInteraction({
      boundary,
      branches: [branch],
      onPointerOutside: pointer,
      onFocusOutside: focus,
    });
    branch.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    outside.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(pointer).toHaveBeenCalledOnce();
    expect(focus).toHaveBeenCalledOnce();
    cleanup();
  });

  it('reference-counts scroll locks and restores inert siblings', () => {
    const app = document.createElement('main');
    const portal = document.createElement('div');
    const dialog = document.createElement('div');
    portal.append(dialog);
    document.body.append(app, portal);
    document.documentElement.style.overflow = 'auto';
    const releaseA = lockDocumentScroll(document);
    const releaseB = lockDocumentScroll(document);
    expect(document.documentElement.style.overflow).toBe('hidden');
    releaseA();
    expect(document.documentElement.style.overflow).toBe('hidden');
    releaseB();
    expect(document.documentElement.style.overflow).toBe('auto');
    const releaseInert = inertSiblings(dialog);
    expect(app.inert).toBe(true);
    expect(app.getAttribute('aria-hidden')).toBe('true');
    releaseInert();
    expect(app.inert).not.toBe(true);
    expect(app.hasAttribute('aria-hidden')).toBe(false);
    app.setAttribute('aria-hidden', 'false');
    const releaseExisting = inertSiblings(dialog);
    releaseExisting();
    expect(app.getAttribute('aria-hidden')).toBe('false');
    releaseB();
  });

  it('discovers scroll parents and manages tabbable focus, trapping, restoration and map focus', () => {
    const scroll = document.createElement('div');
    scroll.style.overflow = 'auto';
    const container = document.createElement('div');
    const first = document.createElement('button');
    const last = document.createElement('button');
    container.append(first, last);
    scroll.append(container);
    document.body.append(scroll);
    vi.spyOn(first, 'getClientRects').mockReturnValue({ length: 1 } as DOMRectList);
    vi.spyOn(last, 'getClientRects').mockReturnValue({ length: 1 } as DOMRectList);
    expect(getScrollableAncestors(container)).toContain(scroll);
    expect(getTabbableElements(container)).toEqual([first, last]);
    expect(focusInitial(container)).toBe(first);
    expect(document.activeElement).toBe(first);
    const release = trapFocus(container);
    last.focus();
    last.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(first);
    first.focus();
    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(last);
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(last);
    outside.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(first);
    release();
    expect(restoreFocus(first)).toBe(true);
    first.remove();
    expect(restoreFocus(first)).toBe(false);
    expect(focusById(new Map([['last', last]]), 'last')).toBe(true);
    expect(focusById(new Map(), 'missing')).toBe(false);
    const empty = document.createElement('div');
    document.body.append(empty);
    expect(focusInitial(empty)).toBe(empty);
    expect(empty.tabIndex).toBe(-1);
    const releaseEmpty = trapFocus(empty);
    empty.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
    empty.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(empty);
    releaseEmpty();
    const disabled = document.createElement('button');
    disabled.disabled = true;
    document.body.append(disabled);
    expect(restoreFocus(disabled)).toBe(false);

    const variants = document.createElement('div');
    const hiddenParent = document.createElement('div');
    hiddenParent.hidden = true;
    hiddenParent.append(document.createElement('button'));
    const inertParent = document.createElement('div');
    inertParent.setAttribute('inert', '');
    inertParent.append(document.createElement('button'));
    const ariaHiddenParent = document.createElement('div');
    ariaHiddenParent.setAttribute('aria-hidden', 'true');
    ariaHiddenParent.append(document.createElement('button'));
    const displayNone = document.createElement('button');
    displayNone.style.display = 'none';
    const invisible = document.createElement('button');
    invisible.style.visibility = 'hidden';
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    const summaryButton = document.createElement('button');
    summary.append(summaryButton);
    details.append(summary, document.createElement('button'));
    const unnamedRadio = document.createElement('input');
    unnamedRadio.type = 'radio';
    const firstRadio = document.createElement('input');
    firstRadio.type = 'radio';
    firstRadio.name = 'group';
    const checkedRadio = document.createElement('input');
    checkedRadio.type = 'radio';
    checkedRadio.name = 'group';
    variants.append(
      hiddenParent,
      inertParent,
      ariaHiddenParent,
      displayNone,
      invisible,
      details,
      unnamedRadio,
      firstRadio,
      checkedRadio,
    );
    document.body.append(variants);
    for (const element of variants.querySelectorAll<HTMLElement>('button,input')) {
      vi.spyOn(element, 'getClientRects').mockReturnValue({ length: 1 } as DOMRectList);
    }
    expect(getTabbableElements(variants)).toEqual([summaryButton, unnamedRadio, firstRadio]);
    checkedRadio.checked = true;
    expect(getTabbableElements(variants)).toEqual([summaryButton, unnamedRadio, checkedRadio]);
    expect(focusInitial(variants, displayNone)).toBe(summaryButton);
    expect(restoreFocus(invisible)).toBe(false);
  });

  it('generates deterministic unique IDs', () => {
    expect(createRuntimeId('test')).not.toBe(createRuntimeId('test'));
  });
});
