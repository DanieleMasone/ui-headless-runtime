import type { Unsubscribe } from '../core/types';

/** Returns whether global `window` and `document` objects are available at invocation time. @public */
export function hasDOM(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/** Registers a DOM listener and returns idempotent cleanup. @internal */
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

/** Resolves an element's document without consulting the global document first. @internal */
export function getOwnerDocument(element?: Node | null): Document | undefined {
  return element?.ownerDocument ?? (hasDOM() ? document : undefined);
}

/** Resolves a node's owning window without preferring the ambient global realm. @internal */
export function getOwnerWindow(element?: Node | null): Window | undefined {
  if (element?.nodeType === 9) return (element as Document).defaultView ?? undefined;
  return getOwnerDocument(element)?.defaultView ?? undefined;
}

/** @internal */
export function isHTMLElement(value: unknown, ownerDocument?: Document): value is HTMLElement {
  if (!value || typeof value !== 'object') return false;
  const document = ownerDocument ?? (value as Node).ownerDocument;
  const Constructor = document?.defaultView?.HTMLElement;
  return Boolean(Constructor && value instanceof Constructor);
}

/** @internal */
export function isHTMLInputElement(value: unknown): value is HTMLInputElement {
  if (!value || typeof value !== 'object') return false;
  const Constructor = (value as Node).ownerDocument?.defaultView?.HTMLInputElement;
  return Boolean(Constructor && value instanceof Constructor);
}

/** @internal */
export function isKeyboardLikeEvent(event: Event): event is KeyboardEvent {
  return 'key' in event && typeof event.key === 'string';
}

/** @internal */
export function isAbortError(error: unknown): boolean {
  return Boolean(
    error && typeof error === 'object' && 'name' in error && error.name === 'AbortError',
  );
}

/** Tests containment across shadow DOM using the event composed path when available. @internal */
export function eventTargets(event: Event, boundary: Node): boolean {
  return event.composedPath().includes(boundary) || boundary.contains(event.target as Node | null);
}

/** Options for document-level outside interaction observation. @internal */
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

/** Document-level pointer and focus callbacks shared by overlay dispatchers. @internal */
export interface DocumentInteractionOptions {
  /** Document whose capture phase should be observed. */
  readonly ownerDocument: Document;
  /** Receives every captured pointer-down interaction. */
  readonly onPointerDown?: (event: PointerEvent) => void;
  /** Receives every captured focus-in interaction. */
  readonly onFocusIn?: (event: FocusEvent) => void;
}

/** Observes document pointer and focus interactions with one idempotent cleanup. @internal */
export function observeDocumentInteraction(options: DocumentInteractionOptions): Unsubscribe {
  const cleanups = [
    listen<PointerEvent>(
      options.ownerDocument,
      'pointerdown',
      (event) => {
        options.onPointerDown?.(event);
      },
      true,
    ),
    listen<FocusEvent>(
      options.ownerDocument,
      'focusin',
      (event) => {
        options.onFocusIn?.(event);
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

/** Observes outside pointer and focus interactions and returns complete cleanup. @internal */
export function observeOutsideInteraction(options: OutsideInteractionOptions): Unsubscribe {
  const ownerDocument = options.boundary.ownerDocument;
  const isInside = (event: Event): boolean =>
    eventTargets(event, options.boundary) ||
    (options.branches?.some((branch) => eventTargets(event, branch)) ?? false);
  return observeDocumentInteraction({
    ownerDocument,
    onPointerDown(event) {
      if (!isInside(event)) options.onPointerOutside?.(event);
    },
    onFocusIn(event) {
      if (!isInside(event)) options.onFocusOutside?.(event);
    },
  });
}

const scrollLocks = new WeakMap<Document, { count: number; overflow: string }>();

/** Acquires a reference-counted document scroll lock and returns a release function. @internal */
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

interface InertLayer {
  readonly element: Element;
  readonly branches: readonly Element[];
  readonly order: number;
  readonly token: symbol;
}

interface InertDocumentState {
  readonly layers: InertLayer[];
  readonly originals: Map<
    HTMLElement,
    { readonly inert: boolean; readonly ariaHidden: string | null }
  >;
}

const inertDocuments = new WeakMap<Document, InertDocumentState>();

const reconcileInertDocument = (ownerDocument: Document, state: InertDocumentState): void => {
  const topLayer = state.layers.at(-1);
  for (const [element, original] of state.originals) {
    if (!element.isConnected) continue;
    element.inert = original.inert;
    if (original.ariaHidden === null) element.removeAttribute('aria-hidden');
    else element.setAttribute('aria-hidden', original.ariaHidden);
  }

  if (!topLayer) return;
  const candidates = [...new Set([topLayer.element, ...topLayer.branches])].filter(
    (candidate) =>
      candidate.ownerDocument === ownerDocument &&
      ![topLayer.element, ...topLayer.branches].some(
        (other) => other !== candidate && other.contains(candidate),
      ),
  );
  const activeChildren = new Map<Element, Set<Element>>();
  for (const candidate of candidates) {
    let activeBranch = candidate;
    while (activeBranch.parentElement) {
      const parent = activeBranch.parentElement;
      const children = activeChildren.get(parent) ?? new Set<Element>();
      children.add(activeBranch);
      activeChildren.set(parent, children);
      if (parent === ownerDocument.body) break;
      activeBranch = parent;
    }
  }
  for (const [parent, children] of activeChildren) {
    for (const sibling of parent.children) {
      if (children.has(sibling) || !isHTMLElement(sibling, ownerDocument)) continue;
      if (!state.originals.has(sibling)) {
        state.originals.set(sibling, {
          inert: sibling.inert,
          ariaHidden: sibling.getAttribute('aria-hidden'),
        });
      }
      sibling.inert = true;
      sibling.setAttribute('aria-hidden', 'true');
    }
  }
};

/**
 * Makes document siblings inert while preserving and restoring their previous state.
 *
 * @remarks Nested modal layers are coordinated per document. Only the topmost modal branch remains
 * interactive, and releasing layers out of order cannot restore the background prematurely.
 * @internal
 */
export function inertSiblings(
  element: Element,
  branches: readonly Element[] = [],
  order = Number.MAX_SAFE_INTEGER,
): Unsubscribe {
  const ownerDocument = element.ownerDocument;
  const state: InertDocumentState = inertDocuments.get(ownerDocument) ?? {
    layers: [],
    originals: new Map(),
  };
  const layer = { element, branches, order, token: Symbol('inert-layer') };
  const insertionIndex = state.layers.findIndex((candidate) => candidate.order > order);
  if (insertionIndex < 0) state.layers.push(layer);
  else state.layers.splice(insertionIndex, 0, layer);
  inertDocuments.set(ownerDocument, state);
  reconcileInertDocument(ownerDocument, state);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    const index = state.layers.findIndex((candidate) => candidate.token === layer.token);
    if (index >= 0) state.layers.splice(index, 1);
    reconcileInertDocument(ownerDocument, state);
    if (state.layers.length === 0) {
      state.originals.clear();
      inertDocuments.delete(ownerDocument);
    }
  };
}

/** Returns scrollable ancestors that can affect anchored positioning. @internal */
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
