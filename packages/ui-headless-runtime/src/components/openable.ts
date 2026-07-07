import { createRuntimeId } from '../accessibility/ids';
import { createControllerHost } from '../core/host';
import { createDisposableScope } from '../core/disposables';
import type {
  ChangeDetails,
  ControllableValueOptions,
  EventSource,
  RuntimeController,
} from '../core/types';
import {
  inertSiblings,
  isHTMLElement,
  listen,
  lockDocumentScroll,
  observeOutsideInteraction,
} from '../dom/dom';
import { focusInitial, restoreFocus, trapFocus } from '../focus/focus';
import { createControllableValue } from '../state/controllable';
import {
  autoUpdatePosition,
  calculatePosition,
  type PositionOptions,
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

/** Shared options used by overlay-style component factories. @public */
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
  readonly positioning?: PositionOptions;
}

/** Internal overlay primitive reused by all public overlay controllers. */
export interface OpenController
  extends RuntimeController<OpenSnapshot>, EventSource<OpenLifecycleEvents> {
  open(details: ChangeDetails<OpenChangeReason>): void;
  close(details: ChangeDetails<OpenChangeReason>): void;
  toggle(details: ChangeDetails<OpenChangeReason>): void;
  bind(elements: OverlayElements): () => void;
  updatePosition(): void;
}

interface StackEntry {
  readonly id: string;
  readonly content: HTMLElement;
  sync(): void;
}

const overlayStacks = new WeakMap<Document, StackEntry[]>();

const details = <TReason extends OpenChangeReason>(
  reason: TReason,
  event?: Event,
): ChangeDetails<TReason> => (event ? { reason, event } : { reason });

export function createOpenController(options: OpenControllerOptions): OpenController {
  const id = options.id ?? createRuntimeId(options.role);
  const host = createControllerHost<OpenSnapshot, OpenLifecycleEvents>({
    open: options.defaultValue ?? false,
    controlled: options.getValue !== undefined,
    topmost: false,
    contentId: id,
    role: options.role,
    position: null,
  });
  let bound: OverlayElements | undefined;
  let openResources = createDisposableScope();
  let restoreTarget: HTMLElement | null = null;
  let stackDocument: Document | undefined;
  let stackEntry: StackEntry | undefined;

  const refreshSnapshot = (position = host.getSnapshot().position): void => {
    const open = state.get();
    const stack = bound ? overlayStacks.get(bound.content.ownerDocument) : undefined;
    const topmost = open && stack?.at(-1)?.id === id;
    const current = host.getSnapshot();
    if (current.open === open && current.topmost === topmost && current.position === position)
      return;
    host.update({ ...current, open, topmost, position });
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

  const updatePosition = (): void => {
    if (!host.alive() || (!bound?.anchor && !bound?.trigger)) return;
    const anchor = bound.anchor ?? bound.trigger;
    if (!anchor) return;
    const rectangle = anchor.getBoundingClientRect();
    const floating = bound.content.getBoundingClientRect();
    const ownerWindow = bound.content.ownerDocument.defaultView;
    const viewportWidth = options.positioning?.viewportWidth ?? ownerWindow?.innerWidth;
    const viewportHeight = options.positioning?.viewportHeight ?? ownerWindow?.innerHeight;
    refreshSnapshot(
      calculatePosition(
        rectangle,
        { width: floating.width, height: floating.height },
        {
          ...options.positioning,
          ...(viewportWidth !== undefined ? { viewportWidth } : {}),
          ...(viewportHeight !== undefined ? { viewportHeight } : {}),
        },
      ),
    );
  };

  const removeFromStack = (): void => {
    if (!stackDocument || !stackEntry) return;
    const stack = overlayStacks.get(stackDocument);
    const index = stack?.indexOf(stackEntry) ?? -1;
    if (stack && index >= 0) stack.splice(index, 1);
    stack?.at(-1)?.sync();
    if (stack?.length === 0) overlayStacks.delete(stackDocument);
    stackDocument = undefined;
    stackEntry = undefined;
  };

  const syncResources = (): void => {
    openResources.dispose();
    openResources = createDisposableScope();
    removeFromStack();
    if (!host.alive() || !state.get() || !bound) {
      refreshSnapshot(null);
      return;
    }
    const { content, trigger, anchor, branches = [] } = bound;
    const ownerDocument = content.ownerDocument;
    restoreTarget =
      trigger ??
      (isHTMLElement(ownerDocument.activeElement, ownerDocument)
        ? ownerDocument.activeElement
        : null);
    const stack = overlayStacks.get(ownerDocument) ?? [];
    const entry: StackEntry = { id, content, sync: () => refreshSnapshot() };
    stack.push(entry);
    overlayStacks.set(ownerDocument, stack);
    stackDocument = ownerDocument;
    stackEntry = entry;
    stack.at(-2)?.sync();
    refreshSnapshot();
    openResources.add(removeFromStack);
    openResources.add(
      listen<KeyboardEvent>(
        ownerDocument,
        'keydown',
        (event) => {
          if (
            event.key === 'Escape' &&
            (options.closeOnEscape ?? true) &&
            stack.at(-1)?.id === id
          ) {
            event.preventDefault();
            change(false, details('escape-key', event));
          }
        },
        true,
      ),
    );
    openResources.add(
      observeOutsideInteraction({
        boundary: content,
        branches: [trigger, ...branches].filter(
          (branch): branch is Element => branch !== undefined,
        ),
        onPointerOutside(event) {
          const higher = stack.slice(stack.findIndex((item) => item.id === id) + 1);
          if (higher.some((item) => event.composedPath().includes(item.content))) return;
          if (options.closeOnOutsidePointer ?? true) {
            change(false, details('outside-pointer', event));
          }
        },
        onFocusOutside(event) {
          const higher = stack.slice(stack.findIndex((item) => item.id === id) + 1);
          if (higher.some((item) => event.composedPath().includes(item.content))) return;
          if (options.closeOnFocusOutside) change(false, details('focus-out', event));
        },
      }),
    );
    if (options.modal) {
      openResources.add(lockDocumentScroll(ownerDocument));
      openResources.add(inertSiblings(content));
    }
    if (options.trapFocus ?? options.modal ?? false) openResources.add(trapFocus(content));
    if (anchor ?? trigger) {
      openResources.add(
        autoUpdatePosition((anchor ?? trigger) as Element | VirtualAnchor, content, updatePosition),
      );
    }
    if (options.focusOnOpen ?? options.modal ?? options.trapFocus ?? false) {
      focusInitial(content, options.initialFocus?.());
    }
  };

  const commit = (open: boolean, changeDetails?: ChangeDetails<OpenChangeReason>): void => {
    refreshSnapshot(open ? host.getSnapshot().position : null);
    syncResources();
    if (!changeDetails) return;
    const payload = { open, details: changeDetails };
    host.emit(open ? 'open' : 'close', payload);
    host.emit('stateChange', payload);
    const dismissedOutside =
      changeDetails.reason === 'outside-pointer' || changeDetails.reason === 'focus-out';
    if (
      !open &&
      (options.restoreFocus ?? true) &&
      (!dismissedOutside || (options.restoreFocusOnOutside ?? options.modal ?? false))
    ) {
      restoreFocus(restoreTarget);
    }
    host.emit(open ? 'afterOpen' : 'afterClose', payload);
  };

  const change = (open: boolean, changeDetails: ChangeDetails<OpenChangeReason>): void => {
    if (!host.alive() || state.get() === open) return;
    const payload = { open, details: changeDetails };
    if (!host.emit(open ? 'beforeOpen' : 'beforeClose', payload)) return;
    if (state.set(open, changeDetails)) commit(open, changeDetails);
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
      bound = elements;
      syncResources();
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        if (bound !== elements) return;
        openResources.dispose();
        removeFromStack();
        bound = undefined;
        refreshSnapshot(null);
      };
    },
    updatePosition,
    destroy() {
      host.destroy();
      bound = undefined;
    },
  };
}
