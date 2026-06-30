import type { Unsubscribe } from '../core/types';

/** Returns whether browser DOM constructors are available at invocation time. @public */
export function hasDOM(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/** Registers a DOM listener and returns idempotent cleanup. @public */
export function listen<TEvent extends Event>(
  target: EventTarget,
  type: string,
  listener: (event: TEvent) => void,
  options?: AddEventListenerOptions | boolean,
): Unsubscribe {
  const callback: EventListener = (event) => listener(event as TEvent);
  target.addEventListener(type, callback, options);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    target.removeEventListener(type, callback, options);
  };
}

/** Resolves an element's document without consulting the global document first. @public */
export function getOwnerDocument(element?: Node | null): Document | undefined {
  return element?.ownerDocument ?? (hasDOM() ? document : undefined);
}

/** Tests containment across shadow DOM using the event composed path when available. @public */
export function eventTargets(event: Event, boundary: Node): boolean {
  return event.composedPath().includes(boundary) || boundary.contains(event.target as Node | null);
}

/** Options for document-level outside interaction observation. @public */
export interface OutsideInteractionOptions {
  /** Element considered inside the owning overlay. */
  readonly boundary: Element;
  /** Additional descendant overlays that should be treated as inside. */
  readonly branches?: readonly Element[];
  /** Receives pointer interactions outside all boundaries. */
  readonly onPointerOutside?: (event: PointerEvent) => void;
  /** Receives focus transitions outside all boundaries. */
  readonly onFocusOutside?: (event: FocusEvent) => void;
}

/** Observes outside pointer and focus interactions and returns complete cleanup. @public */
export function observeOutsideInteraction(options: OutsideInteractionOptions): Unsubscribe {
  const ownerDocument = options.boundary.ownerDocument;
  const isInside = (event: Event): boolean =>
    eventTargets(event, options.boundary) ||
    (options.branches?.some((branch) => eventTargets(event, branch)) ?? false);
  const cleanups = [
    listen<PointerEvent>(
      ownerDocument,
      'pointerdown',
      (event) => {
        if (!isInside(event)) options.onPointerOutside?.(event);
      },
      true,
    ),
    listen<FocusEvent>(
      ownerDocument,
      'focusin',
      (event) => {
        if (!isInside(event)) options.onFocusOutside?.(event);
      },
      true,
    ),
  ];
  return () =>
    cleanups
      .splice(0)
      .reverse()
      .forEach((cleanup) => cleanup());
}

const scrollLocks = new WeakMap<Document, { count: number; overflow: string }>();

/** Acquires a reference-counted document scroll lock and returns a release function. @public */
export function lockDocumentScroll(ownerDocument: Document): Unsubscribe {
  const current = scrollLocks.get(ownerDocument);
  if (current) current.count += 1;
  else {
    scrollLocks.set(ownerDocument, {
      count: 1,
      overflow: ownerDocument.documentElement.style.overflow,
    });
    ownerDocument.documentElement.style.overflow = 'hidden';
  }
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    const lock = scrollLocks.get(ownerDocument);
    if (!lock) return;
    lock.count -= 1;
    if (lock.count === 0) {
      ownerDocument.documentElement.style.overflow = lock.overflow;
      scrollLocks.delete(ownerDocument);
    }
  };
}

/** Makes document siblings inert while preserving and restoring their previous state. @public */
export function inertSiblings(element: Element): Unsubscribe {
  const body = element.ownerDocument.body;
  const branch = [...body.children].find((child) => child === element || child.contains(element));
  const records = [...body.children]
    .filter((child) => child !== branch)
    .map((child) => ({
      child: child as HTMLElement,
      inert: (child as HTMLElement).inert,
      ariaHidden: child.getAttribute('aria-hidden'),
    }));
  for (const { child } of records) {
    child.inert = true;
    child.setAttribute('aria-hidden', 'true');
  }
  return () => {
    for (const record of records) {
      record.child.inert = record.inert;
      if (record.ariaHidden === null) record.child.removeAttribute('aria-hidden');
      else record.child.setAttribute('aria-hidden', record.ariaHidden);
    }
  };
}

/** Returns scrollable ancestors that can affect anchored positioning. @public */
export function getScrollableAncestors(element: Element): readonly Element[] {
  const result: Element[] = [];
  let parent = element.parentElement;
  while (parent) {
    const style = parent.ownerDocument.defaultView?.getComputedStyle(parent);
    if (
      style &&
      /(auto|scroll|overlay)/u.test(`${style.overflow}${style.overflowX}${style.overflowY}`)
    ) {
      result.push(parent);
    }
    parent = parent.parentElement;
  }
  return result;
}
