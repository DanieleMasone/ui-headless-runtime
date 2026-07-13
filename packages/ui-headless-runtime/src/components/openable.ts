import { createRuntimeId } from '../accessibility/ids';
import { createControllerHost } from '../core/host';
import { createDisposableScope } from '../core/disposables';
import type {
  ChangeDetails,
  ControllableValueOptions,
  RuntimeController,
  RuntimeEventSource,
  Unsubscribe,
} from '../core/types';
import {
  eventTargets,
  inertSiblings,
  isHTMLElement,
  listen,
  lockDocumentScroll,
  observeDocumentInteraction,
} from '../dom/dom';
import { focusInitial, restoreFocus, trapFocus } from '../focus/focus';
import { createControllableValue } from '../state/controllable';
import {
  autoUpdatePosition,
  calculatePosition,
  type FloatingPositionOptions,
  type PositionResult,
  type VirtualAnchor,
} from '../positioning/positioning';

/** Cause union shared by dialog, popover, menus, and navigation overlays. @public */
export type OpenChangeReason =
  | 'programmatic'
  | 'trigger'
  | 'escape-key'
  | 'outside-pointer'
  | 'focus-out'
  | 'selection'
  | 'context-menu'
  | 'keyboard'
  | 'hover'
  | 'focus';

/** Payload emitted before and after an overlay open-state transition. @public */
export interface OpenChangeEvent<TReason extends OpenChangeReason = OpenChangeReason> {
  /** Requested next state. */
  readonly open: boolean;
  /** Typed cause and optional native event. */
  readonly details: ChangeDetails<TReason>;
}

/** Lifecycle events consistently emitted by openable controllers. @public */
export interface OpenLifecycleEvents<TReason extends OpenChangeReason = OpenChangeReason> {
  /** Cancellable event emitted before opening. */
  readonly beforeOpen: OpenChangeEvent<TReason>;
  /** Event emitted after the open snapshot is published. */
  readonly open: OpenChangeEvent<TReason>;
  /** Event emitted after opening resources and focus are established. */
  readonly afterOpen: OpenChangeEvent<TReason>;
  /** Cancellable event emitted before closing. */
  readonly beforeClose: OpenChangeEvent<TReason>;
  /** Event emitted after the closed snapshot is published. */
  readonly close: OpenChangeEvent<TReason>;
  /** Event emitted after resources are released and focus restoration is attempted. */
  readonly afterClose: OpenChangeEvent<TReason>;
  /** Event emitted for every accepted open-state mutation. */
  readonly stateChange: OpenChangeEvent<TReason>;
}

/** DOM elements bound to an overlay controller. @public */
export interface OverlayElements {
  /** Optional trigger or focus restoration target. */
  readonly trigger?: HTMLElement;
  /** Floating dialog, popover, or menu element. */
  readonly content: HTMLElement;
  /** Optional backdrop treated as an outside-interaction target. */
  readonly backdrop?: HTMLElement;
  /** Optional positioned anchor; defaults to `trigger`. */
  readonly anchor?: Element | VirtualAnchor;
  /** Descendant overlay branches that remain inside this overlay. */
  readonly branches?: readonly Element[];
}

/** Immutable shared snapshot for openable components. @public */
export interface OpenSnapshot {
  /** Current externally observable open state. */
  readonly open: boolean;
  /** Whether state ownership belongs to the consumer. */
  readonly controlled: boolean;
  /** Whether this overlay is the topmost overlay in its owner document. */
  readonly topmost: boolean;
  /** Stable content ID used by trigger relationships. */
  readonly contentId: string;
  /** Semantic role for consumer-rendered content. */
  readonly role: string;
  /** Latest calculated coordinates, or `null` before positioning. */
  readonly position: PositionResult | null;
}

/** Shared options used by overlay-style component factories. @internal */
export interface OpenControllerOptions extends Partial<
  ControllableValueOptions<boolean, OpenChangeReason>
> {
  /** Consumer-provided deterministic content ID. */
  readonly id?: string;
  /** WAI-ARIA role exposed in the snapshot. */
  readonly role: string;
  /** Whether opening traps focus, locks scroll, and inerts siblings. */
  readonly modal?: boolean;
  /** Whether Escape closes the topmost overlay. @defaultValue `true` */
  readonly closeOnEscape?: boolean;
  /** Whether outside pointer interactions close the overlay. @defaultValue `true` */
  readonly closeOnOutsidePointer?: boolean;
  /** Whether focus leaving all overlay branches closes it. @defaultValue `false` */
  readonly closeOnFocusOutside?: boolean;
  /** Whether keyboard focus is contained while open. */
  readonly trapFocus?: boolean;
  /** Whether the pre-open focus target is restored on close. */
  readonly restoreFocus?: boolean;
  /** Preferred initial focus target resolved after binding. */
  readonly initialFocus?: () => HTMLElement | null;
  /** Whether opening moves focus into content. Defaults to modal/trapping overlays. */
  readonly focusOnOpen?: boolean;
  /** Whether pointer/focus-out dismissal restores the pre-open target. */
  readonly restoreFocusOnOutside?: boolean;
  /** Shared anchored positioning options. */
  readonly positioning?: FloatingPositionOptions;
}

/** Internal overlay primitive reused by all public overlay controllers. @internal */
export interface OpenController
  extends RuntimeController<OpenSnapshot>, RuntimeEventSource<OpenLifecycleEvents> {
  open(details: ChangeDetails<OpenChangeReason>): void;
  close(details: ChangeDetails<OpenChangeReason>): void;
  toggle(details: ChangeDetails<OpenChangeReason>): void;
  bind(elements: OverlayElements): () => void;
  updatePosition(): void;
}

interface StackEntry {
  readonly id: string;
  readonly content: HTMLElement;
  readonly interactionBoundaries: readonly Element[];
  readonly focusScopes: readonly Element[];
  readonly inertBranches: readonly Element[];
  readonly trapsFocus: boolean;
  readonly modal: boolean;
  readonly order: number;
  handleEscape(event: KeyboardEvent): void;
  handlePointerOutside(event: PointerEvent): void;
  handleFocusOutside(event: FocusEvent): void;
  setFocusTrap(scopes: readonly Element[] | undefined): void;
  setInertScope(branches: readonly Element[] | undefined): void;
  publish(topmost: boolean): void;
}

const overlayStacks = new WeakMap<Document, StackEntry[]>();
const overlayStackOrders = new WeakMap<Document, number>();
const overlayReconcileQueue = new Set<Document>();
let overlayMutationDepth = 0;
let flushingOverlayReconcileQueue = false;

const sameElements = (
  left: readonly Element[] | undefined,
  right: readonly Element[] | undefined,
): boolean =>
  left === right ||
  (left !== undefined &&
    right !== undefined &&
    left.length === right.length &&
    left.every((element, index) => element === right[index]));

const uniqueElements = (elements: readonly Element[]): readonly Element[] => [...new Set(elements)];

const stackMatches = (ownerDocument: Document, expected: readonly StackEntry[]): boolean => {
  const current = overlayStacks.get(ownerDocument) ?? [];
  return (
    current.length === expected.length && current.every((entry, index) => entry === expected[index])
  );
};

const reconcileOverlayDocument = (ownerDocument: Document): void => {
  const stack = [...(overlayStacks.get(ownerDocument) ?? [])];
  if (stack.length === 0) return;

  let focusOwnerIndex = -1;
  let modalOwnerIndex = -1;
  let index = stack.length;
  for (const entry of [...stack].reverse()) {
    index -= 1;
    if (focusOwnerIndex < 0 && entry.trapsFocus) focusOwnerIndex = index;
    if (modalOwnerIndex < 0 && entry.modal) modalOwnerIndex = index;
    if (focusOwnerIndex >= 0 && modalOwnerIndex >= 0) break;
  }

  const focusOwner = stack[focusOwnerIndex];
  if (focusOwner) {
    focusOwner.setFocusTrap(
      uniqueElements([
        ...focusOwner.focusScopes,
        ...stack.slice(focusOwnerIndex + 1).flatMap((entry) => entry.focusScopes),
      ]),
    );
  }
  const modalOwner = stack[modalOwnerIndex];
  if (modalOwner) {
    modalOwner.setInertScope(
      uniqueElements([
        ...modalOwner.inertBranches,
        ...stack.slice(modalOwnerIndex + 1).flatMap((entry) => entry.focusScopes),
      ]),
    );
  }
  for (const entry of stack) {
    if (entry !== focusOwner) entry.setFocusTrap(undefined);
    if (entry !== modalOwner) entry.setInertScope(undefined);
  }

  if (!stackMatches(ownerDocument, stack)) {
    overlayReconcileQueue.add(ownerDocument);
    return;
  }
  for (const [index, entry] of stack.entries()) {
    entry.publish(index === stack.length - 1);
    if (!stackMatches(ownerDocument, stack)) {
      overlayReconcileQueue.add(ownerDocument);
      return;
    }
  }
};

const flushOverlayReconcileQueue = (): void => {
  if (overlayMutationDepth > 0 || flushingOverlayReconcileQueue) return;
  flushingOverlayReconcileQueue = true;
  try {
    while (overlayReconcileQueue.size > 0) {
      for (const ownerDocument of overlayReconcileQueue) {
        overlayReconcileQueue.delete(ownerDocument);
        reconcileOverlayDocument(ownerDocument);
        break;
      }
    }
  } finally {
    flushingOverlayReconcileQueue = false;
  }
};

const requestOverlayReconcile = (ownerDocument: Document): void => {
  overlayReconcileQueue.add(ownerDocument);
  flushOverlayReconcileQueue();
};

const beginOverlayMutation = (): void => {
  overlayMutationDepth += 1;
};

const endOverlayMutation = (): void => {
  overlayMutationDepth -= 1;
  flushOverlayReconcileQueue();
};

interface OverlayDocumentDispatcher {
  count: number;
  readonly release: Unsubscribe;
}

const overlayDocumentDispatchers = new WeakMap<Document, OverlayDocumentDispatcher>();

const acquireOverlayDocumentDispatcher = (ownerDocument: Document): Unsubscribe => {
  const current = overlayDocumentDispatchers.get(ownerDocument);
  if (current) {
    current.count += 1;
  } else {
    const releaseInteractions = observeDocumentInteraction({
      ownerDocument,
      onPointerDown(event) {
        const topmost = overlayStacks.get(ownerDocument)?.at(-1);
        if (
          !topmost ||
          topmost.interactionBoundaries.some((boundary) => eventTargets(event, boundary))
        )
          return;
        topmost.handlePointerOutside(event);
      },
      onFocusIn(event) {
        const topmost = overlayStacks.get(ownerDocument)?.at(-1);
        if (
          !topmost ||
          topmost.interactionBoundaries.some((boundary) => eventTargets(event, boundary))
        )
          return;
        topmost.handleFocusOutside(event);
      },
    });
    const releaseEscape = listen<KeyboardEvent>(
      ownerDocument,
      'keydown',
      (event) => {
        if (event.key === 'Escape') overlayStacks.get(ownerDocument)?.at(-1)?.handleEscape(event);
      },
      true,
    );
    overlayDocumentDispatchers.set(ownerDocument, {
      count: 1,
      release() {
        releaseEscape();
        releaseInteractions();
      },
    });
  }
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    const dispatcher = overlayDocumentDispatchers.get(ownerDocument);
    if (!dispatcher) return;
    dispatcher.count -= 1;
    if (dispatcher.count === 0) {
      dispatcher.release();
      overlayDocumentDispatchers.delete(ownerDocument);
    }
  };
};

const details = <TReason extends OpenChangeReason>(
  reason: TReason,
  event: Event,
): ChangeDetails<TReason> => ({ reason, event });

export function createOpenController(options: OpenControllerOptions): OpenController {
  const id = options.id ?? createRuntimeId(options.role);
  const controlled = options.getValue !== undefined;
  const initialOpen = options.getValue?.() ?? options.defaultValue ?? false;
  const host = createControllerHost<OpenSnapshot, OpenLifecycleEvents>({
    open: initialOpen,
    controlled,
    topmost: false,
    contentId: id,
    role: options.role,
    position: null,
  });
  interface BindingRegistration {
    readonly elements: OverlayElements;
    readonly token: symbol;
  }
  let binding: BindingRegistration | undefined;
  let openResources = createDisposableScope();
  let restoreTarget: HTMLElement | null = null;
  let restoreTargetCaptured = false;
  let activeEntry: StackEntry | undefined;
  let sessionDocument: Document | undefined;
  let sessionOrder: number | undefined;
  let currentPosition: PositionResult | null = null;
  let resourceGeneration = 0;
  let transitionGeneration = 0;
  let lifecycleRequestInFlight: boolean | undefined;

  const refreshSnapshot = (topmost?: boolean): void => {
    const open = state.get();
    const currentBinding = binding;
    const stack = currentBinding
      ? overlayStacks.get(currentBinding.elements.content.ownerDocument)
      : undefined;
    const resolvedTopmost =
      open && (topmost ?? (activeEntry !== undefined && stack?.at(-1) === activeEntry));
    const current = host.getSnapshot();
    if (
      current.open === open &&
      current.topmost === resolvedTopmost &&
      current.position === currentPosition
    )
      return;
    host.update({
      ...current,
      open,
      topmost: resolvedTopmost,
      position: currentPosition,
    });
  };
  const state = createControllableValue<boolean, OpenChangeReason>(
    {
      defaultValue: options.defaultValue ?? false,
      ...(options.getValue ? { getValue: options.getValue } : {}),
      ...(options.onValueChange ? { onValueChange: options.onValueChange } : {}),
      ...(options.subscribeValue ? { subscribeValue: options.subscribeValue } : {}),
    },
    (open, changeDetails) => commit(open, changeDetails),
  );

  const calculateBoundPosition = (currentBinding: BindingRegistration): PositionResult | null => {
    const { content } = currentBinding.elements;
    const anchor = currentBinding.elements.anchor ?? currentBinding.elements.trigger;
    if (!anchor) return null;
    const rectangle = anchor.getBoundingClientRect();
    const floating = content.getBoundingClientRect();
    const ownerWindow = content.ownerDocument.defaultView;
    const viewportWidth = options.positioning?.viewportWidth ?? ownerWindow?.innerWidth;
    const viewportHeight = options.positioning?.viewportHeight ?? ownerWindow?.innerHeight;
    return calculatePosition(
      rectangle,
      { width: floating.width, height: floating.height },
      {
        ...options.positioning,
        ...(viewportWidth !== undefined ? { viewportWidth } : {}),
        ...(viewportHeight !== undefined ? { viewportHeight } : {}),
      },
    );
  };

  const updatePositionFor = (currentBinding: BindingRegistration, generation: number): void => {
    if (resourceGeneration !== generation || binding !== currentBinding || !state.get()) return;
    const position = calculateBoundPosition(currentBinding);
    if (resourceGeneration !== generation || binding !== currentBinding || !state.get()) return;
    currentPosition = position;
    refreshSnapshot();
  };

  const updatePosition = (): void => {
    const currentBinding = binding;
    if (!currentBinding) return;
    updatePositionFor(currentBinding, resourceGeneration);
  };

  const syncResources = (): void => {
    resourceGeneration += 1;
    const generation = resourceGeneration;
    const currentBinding = binding;
    const previousResources = openResources;
    const localResources = createDisposableScope();
    openResources = localResources;
    currentPosition = null;
    let createdEntry: StackEntry | undefined;
    let establishingSessionBinding = false;

    const isCurrent = (): boolean =>
      host.alive() &&
      resourceGeneration === generation &&
      openResources === localResources &&
      binding === currentBinding;
    const isCurrentOpen = (): boolean => isCurrent() && state.get();

    beginOverlayMutation();
    try {
      previousResources.dispose();
      if (isCurrentOpen() && currentBinding) {
        const { content, trigger, backdrop, anchor, branches = [] } = currentBinding.elements;
        const ownerDocument = content.ownerDocument;
        let activeSessionOrder = sessionOrder;
        if (sessionDocument !== ownerDocument || activeSessionOrder === undefined) {
          const order = (overlayStackOrders.get(ownerDocument) ?? 0) + 1;
          overlayStackOrders.set(ownerDocument, order);
          sessionDocument = ownerDocument;
          sessionOrder = order;
          activeSessionOrder = order;
          restoreTarget = null;
          restoreTargetCaptured = false;
        }
        establishingSessionBinding = !restoreTargetCaptured;
        if (establishingSessionBinding) {
          restoreTarget =
            trigger ??
            (isHTMLElement(ownerDocument.activeElement, ownerDocument)
              ? ownerDocument.activeElement
              : null);
          restoreTargetCaptured = true;
        } else if (!restoreTarget?.isConnected && trigger?.isConnected) {
          restoreTarget = trigger;
        }

        const focusScopes = uniqueElements(
          [content, ...branches].filter((scope) => scope.ownerDocument === ownerDocument),
        );
        const interactionBoundaries = uniqueElements(
          [content, trigger, ...branches].filter(
            (boundary): boundary is Element =>
              boundary !== undefined && boundary.ownerDocument === ownerDocument,
          ),
        );
        const inertBranches = uniqueElements(
          [backdrop, ...branches].filter(
            (branch): branch is Element =>
              branch !== undefined && branch.ownerDocument === ownerDocument,
          ),
        );
        let installedFocusScopes: readonly Element[] | undefined;
        let installedInertBranches: readonly Element[] | undefined;
        let releaseFocusTrap: Unsubscribe = () => undefined;
        let releaseInertScope: Unsubscribe = () => undefined;

        localResources.add(() => {
          releaseFocusTrap();
          releaseFocusTrap = () => undefined;
          installedFocusScopes = undefined;
        });
        localResources.add(() => {
          releaseInertScope();
          releaseInertScope = () => undefined;
          installedInertBranches = undefined;
        });

        const entry: StackEntry = {
          id,
          content,
          interactionBoundaries,
          focusScopes,
          inertBranches,
          trapsFocus: options.trapFocus ?? options.modal ?? false,
          modal: options.modal ?? false,
          order: activeSessionOrder,
          handleEscape(event) {
            if (!isCurrentOpen() || activeEntry !== entry || !(options.closeOnEscape ?? true))
              return;
            event.preventDefault();
            change(false, details('escape-key', event));
          },
          handlePointerOutside(event) {
            if (
              !isCurrentOpen() ||
              activeEntry !== entry ||
              !(options.closeOnOutsidePointer ?? true)
            )
              return;
            change(false, details('outside-pointer', event));
          },
          handleFocusOutside(event) {
            if (!isCurrentOpen() || activeEntry !== entry || !options.closeOnFocusOutside) return;
            change(false, details('focus-out', event));
          },
          setFocusTrap(scopes) {
            if (!isCurrentOpen() || activeEntry !== entry) return;
            if (sameElements(installedFocusScopes, scopes)) return;
            const nextRelease = scopes
              ? trapFocus(
                  content,
                  scopes.filter((scope) => scope !== content),
                )
              : () => undefined;
            const previousRelease = releaseFocusTrap;
            releaseFocusTrap = nextRelease;
            installedFocusScopes = scopes;
            previousRelease();
          },
          setInertScope(nextBranches) {
            if (!isCurrentOpen() || activeEntry !== entry) return;
            if (sameElements(installedInertBranches, nextBranches)) return;
            const nextRelease = nextBranches
              ? inertSiblings(
                  content,
                  nextBranches.filter((branch) => branch !== content),
                  activeSessionOrder,
                )
              : () => undefined;
            const previousRelease = releaseInertScope;
            releaseInertScope = nextRelease;
            installedInertBranches = nextBranches;
            previousRelease();
          },
          publish(topmost) {
            if (!isCurrentOpen() || activeEntry !== entry) return;
            refreshSnapshot(topmost);
          },
        };
        createdEntry = entry;
        activeEntry = entry;
        const stack = overlayStacks.get(ownerDocument) ?? [];
        const orderedIndex = stack.findIndex((candidate) => candidate.order > activeSessionOrder);
        stack.splice(orderedIndex < 0 ? stack.length : orderedIndex, 0, entry);
        overlayStacks.set(ownerDocument, stack);
        localResources.add(() => {
          const currentStack = overlayStacks.get(ownerDocument);
          const index = currentStack?.indexOf(entry) ?? -1;
          if (currentStack && index >= 0) currentStack.splice(index, 1);
          if (currentStack?.length === 0) overlayStacks.delete(ownerDocument);
          if (activeEntry === entry) activeEntry = undefined;
          requestOverlayReconcile(ownerDocument);
        });
        localResources.add(acquireOverlayDocumentDispatcher(ownerDocument));
        if (options.modal) localResources.add(lockDocumentScroll(ownerDocument));

        const positionedAnchor = anchor ?? trigger;
        if (positionedAnchor) {
          let installing = true;
          const releasePositioning = autoUpdatePosition(positionedAnchor, content, () => {
            if (installing) return;
            updatePositionFor(currentBinding, generation);
          });
          localResources.add(releasePositioning);
          installing = false;
          const position = calculateBoundPosition(currentBinding);
          if (isCurrentOpen() && activeEntry === entry) currentPosition = position;
        }
        requestOverlayReconcile(ownerDocument);
      }
    } catch (error) {
      localResources.dispose();
      throw error;
    } finally {
      endOverlayMutation();
    }

    if (!isCurrent()) return;
    refreshSnapshot();
    if (!isCurrentOpen() || !currentBinding || !createdEntry || activeEntry !== createdEntry)
      return;
    const { content, branches = [] } = currentBinding.elements;
    const stack = overlayStacks.get(content.ownerDocument);
    const activeElement = content.ownerDocument.activeElement;
    const focusWithinBinding = [content, ...branches].some(
      (scope) =>
        activeElement !== null && (scope === activeElement || scope.contains(activeElement)),
    );
    const shouldFocusBinding =
      stack?.at(-1) === createdEntry && (establishingSessionBinding || !focusWithinBinding);
    if (
      shouldFocusBinding &&
      (options.focusOnOpen ?? options.modal ?? options.trapFocus ?? false)
    ) {
      const preferredFocus = options.initialFocus?.();
      if (
        !isCurrentOpen() ||
        binding !== currentBinding ||
        activeEntry !== createdEntry ||
        overlayStacks.get(content.ownerDocument)?.at(-1) !== createdEntry
      )
        return;
      focusInitial(content, preferredFocus, (cleanup) => localResources.add(cleanup));
      if (!isCurrentOpen() || activeEntry !== createdEntry) return;
    }
  };

  const commit = (open: boolean, changeDetails?: ChangeDetails<OpenChangeReason>): void => {
    transitionGeneration += 1;
    const generation = transitionGeneration;
    const closingDocument = activeEntry?.content.ownerDocument ?? sessionDocument;
    const closingOrder = activeEntry?.order ?? sessionOrder;
    const stackBeforeClose =
      !open && closingDocument ? overlayStacks.get(closingDocument) : undefined;
    const hasHigherOverlay =
      closingOrder !== undefined &&
      (stackBeforeClose?.some(
        (candidate) => candidate !== activeEntry && candidate.order > closingOrder,
      ) ??
        false);
    const closingRestoreTarget = restoreTarget;
    const closingCurrentTrigger = binding?.elements.trigger;
    if (open) {
      restoreTarget = null;
      restoreTargetCaptured = false;
      sessionDocument = undefined;
      sessionOrder = undefined;
    }
    syncResources();
    const transitionIsCurrent = (): boolean =>
      host.alive() && transitionGeneration === generation && state.get() === open;
    if (!transitionIsCurrent()) return;
    const payload = changeDetails ? { open, details: changeDetails } : undefined;
    if (payload) {
      host.emit(open ? 'open' : 'close', payload);
      if (!transitionIsCurrent()) return;
      host.emit('stateChange', payload);
      if (!transitionIsCurrent()) return;
    }
    const dismissedOutside =
      changeDetails?.reason === 'outside-pointer' || changeDetails?.reason === 'focus-out';
    if (
      !open &&
      !hasHigherOverlay &&
      (options.restoreFocus ?? true) &&
      (!dismissedOutside || (options.restoreFocusOnOutside ?? options.modal ?? false))
    ) {
      const restoredOriginal = restoreFocus(closingRestoreTarget);
      if (!transitionIsCurrent()) return;
      if (!restoredOriginal && closingCurrentTrigger !== closingRestoreTarget) {
        restoreFocus(closingCurrentTrigger);
        if (!transitionIsCurrent()) return;
      }
    }
    if (payload) {
      host.emit(open ? 'afterOpen' : 'afterClose', payload);
      if (!transitionIsCurrent()) return;
    }
    if (!open) {
      restoreTarget = null;
      restoreTargetCaptured = false;
      sessionDocument = undefined;
      sessionOrder = undefined;
    }
  };

  const change = (open: boolean, changeDetails: ChangeDetails<OpenChangeReason>): void => {
    if (!host.alive() || state.get() === open || lifecycleRequestInFlight === open) return;
    const payload = { open, details: changeDetails };
    const generation = transitionGeneration;
    lifecycleRequestInFlight = open;
    try {
      if (!host.emit(open ? 'beforeOpen' : 'beforeClose', payload)) return;
      if (!host.alive() || transitionGeneration !== generation || state.get() === open) return;
      if (state.set(open, changeDetails)) commit(open, changeDetails);
    } finally {
      if (lifecycleRequestInFlight === open) lifecycleRequestInFlight = undefined;
    }
  };

  host.resources.add(() => state.destroy());
  host.resources.add(() => openResources.dispose());

  return {
    getSnapshot: host.getSnapshot,
    subscribe: host.subscribe,
    on: host.on,
    off: host.off,
    once: host.once,
    open: (changeDetails) => change(true, changeDetails),
    close: (changeDetails) => change(false, changeDetails),
    toggle: (changeDetails) => change(!state.get(), changeDetails),
    bind(elements) {
      if (!host.alive()) return () => undefined;
      const registration: BindingRegistration = {
        elements,
        token: Symbol('overlay-binding'),
      };
      binding = registration;
      syncResources();
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        if (binding !== registration) return;
        binding = undefined;
        syncResources();
      };
    },
    updatePosition,
    destroy() {
      if (!host.alive()) return;
      transitionGeneration += 1;
      resourceGeneration += 1;
      binding = undefined;
      beginOverlayMutation();
      try {
        host.destroy();
      } finally {
        endOverlayMutation();
      }
      activeEntry = undefined;
      currentPosition = null;
      restoreTarget = null;
      restoreTargetCaptured = false;
      sessionDocument = undefined;
      sessionOrder = undefined;
    },
  };
}
