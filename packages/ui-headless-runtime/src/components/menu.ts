import {
  createCollection,
  findTypeaheadMatch,
  type CollectionItem,
} from '../collections/collection';
import { createControllerHost } from '../core/host';
import { createTimeoutManager } from '../core/timers';
import type {
  ChangeDetails,
  ControllableValueOptions,
  RuntimeController,
  RuntimeEventSource,
} from '../core/types';
import { isHTMLElement, isKeyboardLikeEvent } from '../dom/dom';
import { focusById } from '../focus/focus';
import type {
  FloatingPositionOptions,
  PositionResult,
  VirtualAnchor,
} from '../positioning/positioning';
import {
  createOpenController,
  type OpenChangeEvent,
  type OpenChangeReason,
  type OpenLifecycleEvents,
  type OverlayElements,
} from './openable';

/** Menu item kind used to separate actionable items from visual separators. @public */
export type MenuItemKind = 'item' | 'separator';

/** Item metadata registered with the shared menu engine. @public */
export interface MenuItem extends CollectionItem {
  /** Actionable item or non-focusable separator. */
  readonly kind?: MenuItemKind;
  /** Consumer value emitted on activation. */
  readonly value?: string;
  /** Optional submenu identifier opened with ArrowRight. */
  readonly submenuId?: string;
}

/** Menu selection causes. @public */
export type MenuSelectReason = 'pointer' | 'keyboard' | 'programmatic';

/** Menu selection lifecycle payload. @public */
export interface MenuSelectEvent {
  /** Activated item. */
  readonly item: Readonly<MenuItem>;
  /** Typed activation cause and optional native event. */
  readonly details: ChangeDetails<MenuSelectReason>;
}

/** Menu lifecycle events, including cancellable item activation. @public */
export interface MenuEvents extends Omit<OpenLifecycleEvents, 'stateChange'> {
  /** Cancellable event emitted before an item activates. */
  readonly beforeSelect: MenuSelectEvent;
  /** Event emitted after an item activates. */
  readonly select: MenuSelectEvent;
  /** Event emitted for accepted open-state or selection changes. */
  readonly stateChange: OpenChangeEvent | MenuSelectEvent;
}

/** Immutable menu state and WAI-ARIA metadata. @public */
export interface MenuSnapshot {
  /** Stable content ID used by trigger `aria-controls` relationships. */
  readonly contentId: string;
  /** Current open state. */
  readonly open: boolean;
  /** Whether open state is consumer-owned. */
  readonly controlled: boolean;
  /** ID of the keyboard-active item. */
  readonly activeId: string | null;
  /** ID of the last activated item. */
  readonly selectedId: string | null;
  /** ID of the currently requested submenu. */
  readonly openSubmenuId: string | null;
  /** Ordered registered items. */
  readonly items: readonly Readonly<MenuItem>[];
  /** Menu role for consumer markup. */
  readonly role: 'menu';
  /** Latest collision-aware position. */
  readonly position: PositionResult | null;
}

/** Menu engine configuration. @public */
export interface MenuOptions extends Partial<ControllableValueOptions<boolean, OpenChangeReason>> {
  /** Deterministic menu content ID. */
  readonly id?: string;
  /** Whether ArrowUp/ArrowDown wrap at collection edges. @defaultValue `true` */
  readonly loop?: boolean;
  /** Whether item activation closes the menu. @defaultValue `true` */
  readonly closeOnSelect?: boolean;
  /** Shared anchored positioning configuration. */
  readonly positioning?: FloatingPositionOptions;
}

/** Shared Menu controller reused by dropdown and context-menu factories. @public */
export interface MenuController
  extends RuntimeController<MenuSnapshot>, RuntimeEventSource<MenuEvents> {
  /** Opens and focuses the first enabled item by default. */
  open(details?: ChangeDetails<OpenChangeReason>): void;
  /** Closes and restores focus when configured by the binding. */
  close(details?: ChangeDetails<OpenChangeReason>): void;
  /** Requests the opposite open state. */
  toggle(details?: ChangeDetails<OpenChangeReason>): void;
  /** Registers dynamic item metadata and optional focusable DOM. */
  registerItem(item: MenuItem, element?: HTMLElement): () => void;
  /** Connects a registered submenu trigger to a child Menu controller. */
  registerSubmenu(itemId: string, submenu: MenuController): () => void;
  /** Binds trigger/content/anchor DOM for focus, outside interaction, and positioning. */
  bind(elements: OverlayElements): () => void;
  /** Handles Arrow keys, Home/End, typeahead, Enter/Space, Escape, and submenu keys. */
  handleKeyDown(event: KeyboardEvent): void;
  /** Activates an enabled item with a cancellable lifecycle event. */
  select(id: string, details?: ChangeDetails<MenuSelectReason>): void;
  /** Sets the active item for pointer integrations without selecting it. */
  setActive(id: string | null): void;
}

interface ParentMenuContext {
  readonly owner: MenuController;
  readonly token: symbol;
  closeAndRestore(event: KeyboardEvent): void;
}

const parentMenuContexts = new WeakMap<MenuController, ParentMenuContext>();

interface MenuCloseOutcome {
  readonly details: ChangeDetails<OpenChangeReason>;
  readonly result: 'allowed' | 'pending' | 'blocked';
}

const menuCloseOutcomes = new WeakMap<MenuController, MenuCloseOutcome>();

interface SubmenuRegistration {
  readonly submenu: MenuController;
  readonly submenuId: string;
  readonly itemId: string;
  readonly token: symbol;
  readonly contextToken: symbol;
  readonly intentToken: symbol;
  readonly releaseOpen: () => void;
  readonly releaseClose: () => void;
  readonly releaseSnapshot: () => void;
}

interface PendingSubmenuClose {
  readonly submenuId: string;
  readonly registrationToken: symbol;
  readonly details: ChangeDetails<OpenChangeReason>;
  readonly onClosed?: () => void;
}

interface PendingSubmenuOpen {
  readonly submenuId: string;
  readonly registrationToken: symbol;
  readonly itemId: string;
  readonly itemToken: symbol;
  readonly details: ChangeDetails<OpenChangeReason>;
  readonly deferredUntilClose?: true;
}

/** Creates the shared headless Menu engine. @public */
export function createMenu(options: MenuOptions = {}): MenuController {
  const collection = createCollection<MenuItem>();
  const elements = new Map<string, HTMLElement>();
  const itemRegistrations = new Map<string, { readonly token: symbol }>();
  const itemRegistrationIntents = new Map<string, symbol>();
  const submenuRegistrations = new Map<string, SubmenuRegistration>();
  const submenuRegistrationIntents = new Map<string, symbol>();
  let pendingSubmenuClose: PendingSubmenuClose | undefined;
  let pendingSubmenuOpen: PendingSubmenuOpen | undefined;
  const rejectedSubmenuOpens = new Set<symbol>();
  const overlay = createOpenController({
    role: 'menu',
    closeOnFocusOutside: true,
    ...(options.id ? { id: options.id } : {}),
    ...(options.defaultValue !== undefined ? { defaultValue: options.defaultValue } : {}),
    ...(options.getValue ? { getValue: options.getValue } : {}),
    ...(options.onValueChange ? { onValueChange: options.onValueChange } : {}),
    ...(options.subscribeValue ? { subscribeValue: options.subscribeValue } : {}),
    ...(options.positioning ? { positioning: options.positioning } : {}),
  });
  const initialOverlay = overlay.getSnapshot();
  const host = createControllerHost<MenuSnapshot, MenuEvents>({
    contentId: initialOverlay.contentId,
    open: initialOverlay.open,
    controlled: initialOverlay.controlled,
    activeId: null,
    selectedId: null,
    openSubmenuId: null,
    items: [],
    role: 'menu',
    position: initialOverlay.position,
  });
  let typeahead = '';
  const typeaheadTimer = createTimeoutManager();
  const sync = (): void => {
    const overlaySnapshot = overlay.getSnapshot();
    const current = host.getSnapshot();
    host.update({
      ...current,
      contentId: overlaySnapshot.contentId,
      open: overlaySnapshot.open,
      controlled: overlaySnapshot.controlled,
      items: collection.items(),
      position: overlaySnapshot.position,
    });
  };
  let previousOverlayOpen = initialOverlay.open;
  const openEventNames = ['beforeOpen', 'open', 'afterOpen', 'close', 'afterClose'] as const;
  for (const name of openEventNames) {
    host.resources.add(
      overlay.on(name, (event) => {
        if (!host.emit(name, event.detail)) event.preventDefault();
      }),
    );
  }
  host.resources.add(overlay.on('stateChange', (event) => host.emit('stateChange', event.detail)));
  const setActive = (id: string | null, focus = true): boolean => {
    if (!host.alive()) return false;
    if (id) {
      const item = collection.get(id);
      if (!item || item.disabled || item.kind === 'separator') return false;
    }
    if (host.getSnapshot().activeId !== id) host.update({ ...host.getSnapshot(), activeId: id });
    if (focus && id) focusById(elements, id);
    return true;
  };
  const clearOpenSubmenu = (submenuId: string): void => {
    if (host.getSnapshot().openSubmenuId === submenuId)
      host.update({ ...host.getSnapshot(), openSubmenuId: null });
  };
  const cancelPendingSubmenuOpen = (): void => {
    if (pendingSubmenuOpen && !pendingSubmenuOpen.deferredUntilClose)
      rejectedSubmenuOpens.add(pendingSubmenuOpen.registrationToken);
    pendingSubmenuOpen = undefined;
  };
  const completePendingSubmenuClose = (
    registration: SubmenuRegistration,
    changeDetails: ChangeDetails<OpenChangeReason>,
  ): void => {
    const pending = pendingSubmenuClose;
    if (
      !pending ||
      pending.submenuId !== registration.submenuId ||
      pending.registrationToken !== registration.token
    )
      return;
    pendingSubmenuClose = undefined;
    if (pending.details === changeDetails) pending.onClosed?.();
  };
  const completePendingSubmenuOpen = (
    registration: SubmenuRegistration,
    changeDetails: ChangeDetails<OpenChangeReason>,
  ): void => {
    const pending = pendingSubmenuOpen;
    if (
      !pending ||
      pending.submenuId !== registration.submenuId ||
      pending.registrationToken !== registration.token
    )
      return;
    pendingSubmenuOpen = undefined;
    if (pending.details !== changeDetails) {
      rejectedSubmenuOpens.add(registration.token);
      return;
    }
    rejectedSubmenuOpens.delete(registration.token);
    const item = collection.get(pending.itemId);
    if (
      itemRegistrations.get(pending.itemId)?.token !== pending.itemToken ||
      !item ||
      item.disabled ||
      item.kind === 'separator' ||
      item.submenuId !== pending.submenuId
    ) {
      registration.submenu.close({ reason: 'programmatic' });
      return;
    }
    setActive(pending.itemId, false);
    host.update({ ...host.getSnapshot(), openSubmenuId: pending.submenuId });
  };
  const requestSubmenuClose = (
    submenuId: string,
    closeDetails: ChangeDetails<OpenChangeReason>,
    onClosed: () => void,
  ): 'completed' | 'pending' | 'blocked' => {
    cancelPendingSubmenuOpen();
    pendingSubmenuClose = undefined;
    const registration = submenuRegistrations.get(submenuId);
    if (!registration || !registration.submenu.getSnapshot().open) {
      clearOpenSubmenu(submenuId);
      onClosed();
      return 'completed';
    }
    const pending: PendingSubmenuClose = {
      submenuId,
      registrationToken: registration.token,
      details: closeDetails,
      onClosed,
    };
    pendingSubmenuClose = pending;
    const cancellation = { prevented: false };
    const observeCancellation = registration.submenu.on('beforeClose', (event) => {
      cancellation.prevented = event.defaultPrevented;
    });
    try {
      registration.submenu.close(closeDetails);
    } catch (error) {
      if (pendingSubmenuClose === pending) pendingSubmenuClose = undefined;
      throw error;
    } finally {
      observeCancellation();
    }
    const nestedOutcome = menuCloseOutcomes.get(registration.submenu);
    const nestedResult = nestedOutcome?.details === closeDetails ? nestedOutcome.result : undefined;
    if (!registration.submenu.getSnapshot().open) {
      if (pendingSubmenuClose === pending) {
        pendingSubmenuClose = undefined;
        clearOpenSubmenu(submenuId);
        onClosed();
      }
      return 'completed';
    }
    if (cancellation.prevented || nestedResult === 'blocked') {
      if (pendingSubmenuClose === pending) pendingSubmenuClose = undefined;
      return 'blocked';
    }
    if (nestedResult === 'pending') return 'pending';
    if (!registration.submenu.getSnapshot().controlled) {
      if (pendingSubmenuClose === pending) pendingSubmenuClose = undefined;
      return 'blocked';
    }
    return 'pending';
  };
  const requestSubmenuOpen = (
    registration: SubmenuRegistration,
    itemToken: symbol,
    openDetails: ChangeDetails<OpenChangeReason>,
  ): 'completed' | 'pending' | 'blocked' => {
    const closing = pendingSubmenuClose;
    pendingSubmenuOpen = undefined;
    if (
      closing?.submenuId === registration.submenuId &&
      closing.registrationToken === registration.token &&
      registration.submenu.getSnapshot().open
    ) {
      const deferred: PendingSubmenuOpen = {
        submenuId: registration.submenuId,
        registrationToken: registration.token,
        itemId: registration.itemId,
        itemToken,
        details: openDetails,
        deferredUntilClose: true,
      };
      pendingSubmenuOpen = deferred;
      pendingSubmenuClose = {
        submenuId: closing.submenuId,
        registrationToken: closing.registrationToken,
        details: closing.details,
      };
      return 'pending';
    }
    pendingSubmenuClose = undefined;
    const pending: PendingSubmenuOpen = {
      submenuId: registration.submenuId,
      registrationToken: registration.token,
      itemId: registration.itemId,
      itemToken,
      details: openDetails,
    };
    pendingSubmenuOpen = pending;
    if (registration.submenu.getSnapshot().open) {
      completePendingSubmenuOpen(registration, openDetails);
      return 'completed';
    }
    const cancellation = { prevented: false };
    const observeCancellation = registration.submenu.on('beforeOpen', (event) => {
      cancellation.prevented = event.defaultPrevented;
    });
    try {
      registration.submenu.open(openDetails);
    } catch (error) {
      if (pendingSubmenuOpen === pending) pendingSubmenuOpen = undefined;
      throw error;
    } finally {
      observeCancellation();
    }
    if (registration.submenu.getSnapshot().open) {
      return 'completed';
    }
    if (cancellation.prevented || !registration.submenu.getSnapshot().controlled) {
      if (pendingSubmenuOpen === pending) pendingSubmenuOpen = undefined;
      return 'blocked';
    }
    return 'pending';
  };
  const closeSubmenu = (event: KeyboardEvent): boolean => {
    const snapshot = host.getSnapshot();
    const submenuId = snapshot.openSubmenuId;
    if (!submenuId) return true;
    const registration = submenuRegistrations.get(submenuId);
    if (!registration) return true;
    const closeDetails: ChangeDetails<OpenChangeReason> = { reason: 'keyboard', event };
    return (
      requestSubmenuClose(submenuId, closeDetails, () => setActive(registration.itemId)) ===
      'completed'
    );
  };
  host.resources.add(
    overlay.on('beforeClose', (event) => {
      const closeDetails = event.detail.details;
      if (!host.emit('beforeClose', event.detail)) {
        menuCloseOutcomes.set(controller, { details: closeDetails, result: 'blocked' });
        event.preventDefault();
        return;
      }
      const submenuId = host.getSnapshot().openSubmenuId;
      if (!submenuId) {
        menuCloseOutcomes.set(controller, { details: closeDetails, result: 'allowed' });
        return;
      }
      let retryAfterChildClose = false;
      const result = requestSubmenuClose(submenuId, closeDetails, () => {
        queueMicrotask(() => {
          if (retryAfterChildClose && host.alive() && overlay.getSnapshot().open)
            overlay.close(closeDetails);
        });
      });
      retryAfterChildClose = result === 'pending';
      menuCloseOutcomes.set(controller, {
        details: closeDetails,
        result: result === 'completed' ? 'allowed' : result,
      });
      if (result !== 'completed') event.preventDefault();
    }),
  );
  host.resources.add(
    overlay.subscribe((snapshot) => {
      const opened = snapshot.open && !previousOverlayOpen;
      const closed = !snapshot.open && previousOverlayOpen;
      previousOverlayOpen = snapshot.open;
      sync();
      if (opened) setActive(collection.edge('first') ?? null);
      if (closed) {
        cancelPendingSubmenuOpen();
        pendingSubmenuClose = undefined;
        const submenuId = host.getSnapshot().openSubmenuId;
        if (submenuId) {
          try {
            submenuRegistrations.get(submenuId)?.submenu.close({ reason: 'programmatic' });
          } finally {
            clearOpenSubmenu(submenuId);
          }
        }
      }
    }),
  );
  const select = (
    id: string,
    selectDetails: ChangeDetails<MenuSelectReason> = { reason: 'programmatic' },
  ): void => {
    const item = collection.get(id);
    if (!item || item.disabled || item.kind === 'separator') return;
    const itemToken = itemRegistrations.get(id)?.token;
    if (!itemToken) return;
    cancelPendingSubmenuOpen();
    if (item.submenuId) {
      const submenuId = item.submenuId;
      const registration = submenuRegistrations.get(submenuId);
      if (!registration || registration.itemId !== id) return;
      const openDetails: ChangeDetails<OpenChangeReason> = {
        reason: selectDetails.reason === 'keyboard' ? 'keyboard' : 'trigger',
        ...(selectDetails.event ? { event: selectDetails.event } : {}),
      };
      const openTarget = (): void => {
        const currentItem = collection.get(id);
        const currentRegistration = submenuRegistrations.get(submenuId);
        if (
          itemRegistrations.get(id)?.token !== itemToken ||
          currentRegistration?.token !== registration.token ||
          !currentItem ||
          currentItem.disabled ||
          currentItem.kind === 'separator' ||
          currentItem.submenuId !== submenuId
        )
          return;
        requestSubmenuOpen(currentRegistration, itemToken, openDetails);
      };
      const current = host.getSnapshot().openSubmenuId;
      if (current && current !== submenuId) {
        const closeDetails: ChangeDetails<OpenChangeReason> = {
          reason: 'selection',
          ...(selectDetails.event ? { event: selectDetails.event } : {}),
        };
        requestSubmenuClose(current, closeDetails, openTarget);
        return;
      }
      openTarget();
      return;
    }
    const payload = { item, details: selectDetails };
    if (!host.emit('beforeSelect', payload)) return;
    const finishSelection = (): void => {
      const current = collection.get(id);
      if (
        itemRegistrations.get(id)?.token !== itemToken ||
        !current ||
        current.disabled ||
        current.kind === 'separator'
      )
        return;
      host.update({
        ...host.getSnapshot(),
        activeId: id,
        selectedId: id,
        openSubmenuId: null,
      });
      host.emit('select', payload);
      host.emit('stateChange', payload);
      if (options.closeOnSelect ?? true)
        overlay.close({
          reason: 'selection',
          ...(selectDetails.event ? { event: selectDetails.event } : {}),
        });
    };
    const openSubmenuId = host.getSnapshot().openSubmenuId;
    if (openSubmenuId) {
      requestSubmenuClose(
        openSubmenuId,
        {
          reason: 'selection',
          ...(selectDetails.event ? { event: selectDetails.event } : {}),
        },
        finishSelection,
      );
      return;
    }
    finishSelection();
  };
  const move = (delta: 1 | -1): void => {
    setActive(
      collection.move(host.getSnapshot().activeId ?? undefined, delta, options.loop ?? true) ??
        null,
    );
  };
  const resetTypeahead = (): void => {
    typeahead = '';
  };
  host.resources.add(resetTypeahead);
  host.resources.add(typeaheadTimer.clear);
  host.resources.add(() => overlay.destroy());
  host.resources.add(() => collection.clear());
  host.resources.add(() => elements.clear());
  host.resources.add(() => itemRegistrations.clear());
  host.resources.add(() => itemRegistrationIntents.clear());
  const releaseSubmenuRegistration = (registration: SubmenuRegistration): void => {
    registration.releaseOpen();
    registration.releaseClose();
    registration.releaseSnapshot();
    if (submenuRegistrations.get(registration.submenuId)?.token === registration.token) {
      submenuRegistrations.delete(registration.submenuId);
      clearOpenSubmenu(registration.submenuId);
    }
    if (parentMenuContexts.get(registration.submenu)?.token === registration.contextToken)
      parentMenuContexts.delete(registration.submenu);
    if (submenuRegistrationIntents.get(registration.submenuId) === registration.intentToken)
      submenuRegistrationIntents.delete(registration.submenuId);
    if (pendingSubmenuClose?.registrationToken === registration.token)
      pendingSubmenuClose = undefined;
    if (pendingSubmenuOpen?.registrationToken === registration.token)
      pendingSubmenuOpen = undefined;
    rejectedSubmenuOpens.delete(registration.token);
  };
  const detachSubmenuRegistration = (registration: SubmenuRegistration): void => {
    try {
      if (registration.submenu.getSnapshot().open)
        registration.submenu.close({ reason: 'programmatic' });
    } catch {
      // Structural ownership must still detach when consumer-controlled close logic throws.
    } finally {
      releaseSubmenuRegistration(registration);
    }
  };
  const controller: MenuController = {
    getSnapshot: host.getSnapshot,
    subscribe: host.subscribe,
    on: host.on,
    off: host.off,
    once: host.once,
    open(changeDetails = { reason: 'programmatic' }) {
      overlay.open(changeDetails);
    },
    close(changeDetails = { reason: 'programmatic' }) {
      menuCloseOutcomes.delete(controller);
      overlay.close(changeDetails);
    },
    toggle(changeDetails = { reason: 'programmatic' }) {
      overlay.toggle(changeDetails);
    },
    registerItem(item, element) {
      if (!host.alive()) return () => undefined;
      const intentToken = Symbol(`item-intent-${item.id}`);
      itemRegistrationIntents.set(item.id, intentToken);
      const kind = item.kind ?? 'item';
      const normalized: MenuItem = {
        ...item,
        kind,
        disabled: item.disabled ?? kind === 'separator',
      };
      let active = true;
      let applied: { readonly token: symbol; readonly unregister: () => void } | undefined;
      const reconcileItem = (): void => {
        sync();
        const current = collection.get(item.id);
        if (host.getSnapshot().activeId === item.id) {
          if (!current || current.disabled || current.kind === 'separator')
            setActive(collection.edge('first') ?? null);
          else setActive(item.id);
        } else if (
          overlay.getSnapshot().open &&
          host.getSnapshot().activeId === null &&
          current &&
          !current.disabled &&
          current.kind !== 'separator'
        )
          setActive(item.id);
      };
      const apply = (): void => {
        if (!active || applied || itemRegistrationIntents.get(item.id) !== intentToken) return;
        const token = Symbol(item.id);
        itemRegistrations.set(item.id, { token });
        const unregister = collection.register(normalized);
        if (element) elements.set(item.id, element);
        else elements.delete(item.id);
        applied = { token, unregister };
        reconcileItem();
      };
      const currentItem = collection.get(item.id);
      const openSubmenuId = host.getSnapshot().openSubmenuId;
      const invalidatesOpenSubmenu =
        openSubmenuId !== null &&
        currentItem?.submenuId === openSubmenuId &&
        (normalized.disabled ||
          normalized.kind === 'separator' ||
          normalized.submenuId !== openSubmenuId);
      if (invalidatesOpenSubmenu) {
        const registration = submenuRegistrations.get(openSubmenuId);
        try {
          if (registration) detachSubmenuRegistration(registration);
          else clearOpenSubmenu(openSubmenuId);
        } finally {
          apply();
        }
      } else apply();
      return () => {
        if (!active) return;
        active = false;
        if (!applied) {
          if (itemRegistrationIntents.get(item.id) === intentToken)
            itemRegistrationIntents.delete(item.id);
          return;
        }
        const owned = applied;
        const release = (): void => {
          owned.unregister();
          if (itemRegistrations.get(item.id)?.token === owned.token) {
            itemRegistrations.delete(item.id);
            elements.delete(item.id);
          }
          if (itemRegistrationIntents.get(item.id) === intentToken)
            itemRegistrationIntents.delete(item.id);
          reconcileItem();
        };
        const registeredItem = collection.get(item.id);
        const ownsItem = itemRegistrations.get(item.id)?.token === owned.token;
        const submenuRegistration = registeredItem?.submenuId
          ? submenuRegistrations.get(registeredItem.submenuId)
          : undefined;
        try {
          if (ownsItem && submenuRegistration?.itemId === item.id)
            detachSubmenuRegistration(submenuRegistration);
        } finally {
          release();
        }
      };
    },
    registerSubmenu(itemId, submenu) {
      if (!host.alive()) return () => undefined;
      const item = collection.get(itemId);
      if (!item?.submenuId || item.disabled || item.kind === 'separator') return () => undefined;
      const submenuId = item.submenuId;
      const previous = submenuRegistrations.get(submenuId);
      const existingParent = parentMenuContexts.get(submenu);
      if (
        existingParent &&
        (existingParent.owner !== controller || existingParent.token !== previous?.contextToken)
      )
        return () => undefined;
      const itemToken = itemRegistrations.get(itemId)?.token;
      if (!itemToken) return () => undefined;
      const intentToken = Symbol(`submenu-intent-${submenuId}`);
      submenuRegistrationIntents.set(submenuId, intentToken);
      let active = true;
      let installed: SubmenuRegistration | undefined;
      const install = (): void => {
        if (submenuRegistrationIntents.get(submenuId) !== intentToken) return;
        if (previous) detachSubmenuRegistration(previous);
        const validatedItem = collection.get(itemId);
        if (
          submenuRegistrationIntents.get(submenuId) !== intentToken ||
          submenuRegistrations.has(submenuId) ||
          parentMenuContexts.has(submenu) ||
          itemRegistrations.get(itemId)?.token !== itemToken ||
          !validatedItem ||
          validatedItem.disabled ||
          validatedItem.kind === 'separator' ||
          validatedItem.submenuId !== submenuId
        ) {
          if (submenuRegistrationIntents.get(submenuId) === intentToken)
            submenuRegistrationIntents.delete(submenuId);
          return;
        }
        const token = Symbol(submenuId);
        const contextToken = Symbol(`parent-${submenuId}`);
        let previousOpen = submenu.getSnapshot().open;
        const releaseOpen = submenu.on('open', (event) => {
          const pending = pendingSubmenuOpen;
          const matchesPending =
            pending?.registrationToken === token && pending.details === event.detail.details;
          const current = submenuRegistrations.get(submenuId);
          if (current?.token === token) completePendingSubmenuOpen(current, event.detail.details);
          const rejected = rejectedSubmenuOpens.has(token);
          if (matchesPending) rejectedSubmenuOpens.delete(token);
          else if (rejected && host.getSnapshot().openSubmenuId !== submenuId) {
            rejectedSubmenuOpens.delete(token);
            submenu.close({ reason: 'programmatic' });
          }
        });
        const releaseClose = submenu.on('close', (event) => {
          clearOpenSubmenu(submenuId);
          const current = submenuRegistrations.get(submenuId);
          if (current?.token === token) completePendingSubmenuClose(current, event.detail.details);
        });
        const releaseSnapshot = submenu.subscribe((snapshot) => {
          const closed = !snapshot.open && previousOpen;
          previousOpen = snapshot.open;
          if (closed) {
            clearOpenSubmenu(submenuId);
            const deferred =
              pendingSubmenuOpen?.registrationToken === token &&
              pendingSubmenuOpen.deferredUntilClose
                ? pendingSubmenuOpen
                : undefined;
            queueMicrotask(() => {
              if (deferred && pendingSubmenuOpen === deferred && !submenu.getSnapshot().open) {
                pendingSubmenuOpen = undefined;
                const current = submenuRegistrations.get(submenuId);
                const currentItem = collection.get(deferred.itemId);
                if (
                  current?.token === token &&
                  itemRegistrations.get(deferred.itemId)?.token === deferred.itemToken &&
                  currentItem &&
                  !currentItem.disabled &&
                  currentItem.kind !== 'separator' &&
                  currentItem.submenuId === submenuId
                )
                  requestSubmenuOpen(current, deferred.itemToken, deferred.details);
              }
            });
          }
        });
        const registration: SubmenuRegistration = {
          submenu,
          submenuId,
          itemId,
          token,
          contextToken,
          intentToken,
          releaseOpen,
          releaseClose,
          releaseSnapshot,
        };
        installed = registration;
        submenuRegistrations.set(submenuId, registration);
        parentMenuContexts.set(submenu, {
          owner: controller,
          token: contextToken,
          closeAndRestore(event) {
            const closeDetails: ChangeDetails<OpenChangeReason> = { reason: 'keyboard', event };
            requestSubmenuClose(submenuId, closeDetails, () => {
              const current = submenuRegistrations.get(submenuId);
              const currentItem = collection.get(itemId);
              if (
                !overlay.getSnapshot().open ||
                current?.token !== token ||
                !currentItem ||
                currentItem.disabled ||
                currentItem.kind === 'separator' ||
                currentItem.submenuId !== submenuId
              )
                return;
              setActive(itemId);
            });
          },
        });
      };
      install();
      return () => {
        if (!active) return;
        active = false;
        if (!installed || submenuRegistrations.get(submenuId)?.token !== installed.token) {
          if (submenuRegistrationIntents.get(submenuId) === intentToken)
            submenuRegistrationIntents.delete(submenuId);
          return;
        }
        detachSubmenuRegistration(installed);
      };
    },
    bind: overlay.bind,
    handleKeyDown(event) {
      if (event.defaultPrevented || !host.alive() || !overlay.getSnapshot().open) return;
      if (event.key === 'ArrowDown') move(1);
      else if (event.key === 'ArrowUp') move(-1);
      else if (event.key === 'Home') setActive(collection.edge('first') ?? null);
      else if (event.key === 'End') setActive(collection.edge('last') ?? null);
      else if (event.key === 'Enter' || event.key === ' ') {
        const activeId = host.getSnapshot().activeId;
        if (activeId) select(activeId, { reason: 'keyboard', event });
      } else if (event.key === 'ArrowRight') {
        const active = host.getSnapshot().activeId;
        const submenuId = active ? collection.get(active)?.submenuId : undefined;
        if (active && submenuId && submenuRegistrations.has(submenuId))
          select(active, { reason: 'keyboard', event });
      } else if (event.key === 'ArrowLeft') {
        const parentContext = parentMenuContexts.get(controller);
        if (parentContext) parentContext.closeAndRestore(event);
        else closeSubmenu(event);
      } else if (event.key === 'Escape') {
        overlay.close({ reason: 'escape-key', event });
        event.preventDefault();
        return;
      } else if (event.key === 'Tab') {
        overlay.close({ reason: 'focus-out', event });
        return;
      } else if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
        typeahead += event.key;
        const match = findTypeaheadMatch(
          collection.items(),
          typeahead,
          host.getSnapshot().activeId ?? undefined,
        );
        if (match) setActive(match);
        typeaheadTimer.schedule(resetTypeahead, 500);
      } else return;
      event.preventDefault();
    },
    select,
    setActive,
    destroy: host.destroy,
  };
  host.resources.add(() => {
    pendingSubmenuClose = undefined;
    pendingSubmenuOpen = undefined;
    rejectedSubmenuOpens.clear();
    for (const registration of submenuRegistrations.values()) {
      registration.releaseOpen();
      registration.releaseClose();
      registration.releaseSnapshot();
      if (parentMenuContexts.get(registration.submenu)?.token === registration.contextToken)
        parentMenuContexts.delete(registration.submenu);
    }
    submenuRegistrations.clear();
    submenuRegistrationIntents.clear();
  });
  return controller;
}

/** Dropdown Menu controller with trigger-specific activation. @public */
export interface DropdownMenuController extends MenuController {
  /** Opens on pointer click or ArrowDown/Enter/Space keyboard activation. */
  handleTrigger(event: MouseEvent | KeyboardEvent): void;
}

/** Creates a Dropdown Menu backed by the shared Menu engine and positioning layer. @public */
export function createDropdownMenu(options: MenuOptions = {}): DropdownMenuController {
  const menu = createMenu(options);
  let destroyed = false;
  let pendingLastOpen: ChangeDetails<OpenChangeReason> | undefined;
  const focusLast = (): void => {
    const last = [...menu.getSnapshot().items]
      .reverse()
      .find((item) => !item.disabled && item.kind !== 'separator');
    menu.setActive(last?.id ?? null);
  };
  const releaseOpen = menu.on('open', (event) => {
    const pending = pendingLastOpen;
    pendingLastOpen = undefined;
    if (pending && pending === event.detail.details) focusLast();
  });
  return {
    ...menu,
    handleTrigger(event) {
      if (destroyed) return;
      const keyboard = isKeyboardLikeEvent(event);
      if (keyboard && !['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      const openDetails: ChangeDetails<OpenChangeReason> = {
        reason: keyboard ? 'keyboard' : 'trigger',
        event,
      };
      pendingLastOpen = keyboard && event.key === 'ArrowUp' ? openDetails : undefined;
      const cancellation = { prevented: false };
      const observeCancellation = menu.on('beforeOpen', (openEvent) => {
        cancellation.prevented = openEvent.defaultPrevented;
      });
      try {
        menu.open(openDetails);
      } finally {
        observeCancellation();
      }
      if (cancellation.prevented) pendingLastOpen = undefined;
      else if (pendingLastOpen === openDetails && menu.getSnapshot().open) {
        pendingLastOpen = undefined;
        focusLast();
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      pendingLastOpen = undefined;
      releaseOpen();
      menu.destroy();
    },
  };
}

/** Context Menu controller supporting pointer and keyboard virtual anchors. @public */
export interface ContextMenuController extends MenuController {
  /** Opens at pointer coordinates and prevents the native menu only while active. */
  handleContextMenu(event: MouseEvent, content: HTMLElement): () => void;
  /** Opens from Shift+F10 or ContextMenu keyboard activation. */
  handleKeyboardOpen(event: KeyboardEvent, trigger: HTMLElement, content: HTMLElement): () => void;
}

/** Creates a Context Menu backed by the same item, submenu, and typeahead engine. @public */
export function createContextMenu(options: MenuOptions = {}): ContextMenuController {
  const menu = createMenu(options);
  let unbind: () => void = () => undefined;
  let destroyed = false;
  const bindAt = (
    anchor: Element | VirtualAnchor,
    trigger: HTMLElement,
    content: HTMLElement,
    openDetails: ChangeDetails<OpenChangeReason>,
  ): (() => void) => {
    unbind();
    unbind = menu.bind({ anchor, trigger, content });
    menu.open(openDetails);
    return unbind;
  };
  return {
    ...menu,
    handleContextMenu(event, content) {
      if (destroyed || !isHTMLElement(event.currentTarget)) return () => undefined;
      const anchor: VirtualAnchor = {
        contextElement: event.currentTarget,
        getBoundingClientRect: () => ({ x: event.clientX, y: event.clientY, width: 0, height: 0 }),
      };
      const release = bindAt(anchor, event.currentTarget, content, {
        reason: 'context-menu',
        event,
      });
      if (menu.getSnapshot().open) event.preventDefault();
      return release;
    },
    handleKeyboardOpen(event, trigger, content) {
      if (destroyed) return () => undefined;
      if (!(event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')))
        return () => undefined;
      const release = bindAt(trigger, trigger, content, { reason: 'keyboard', event });
      if (menu.getSnapshot().open) event.preventDefault();
      return release;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unbind();
      menu.destroy();
    },
  };
}
