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
  EventSource,
  RuntimeController,
} from '../core/types';
import { isHTMLElement, isKeyboardLikeEvent } from '../dom/dom';
import { focusById } from '../focus/focus';
import type { PositionOptions, PositionResult, VirtualAnchor } from '../positioning/positioning';
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
  /** Event emitted for open, active-item, or selection state changes. */
  readonly stateChange: OpenChangeEvent | MenuSelectEvent;
}

/** Immutable menu state and WAI-ARIA metadata. @public */
export interface MenuSnapshot {
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
  readonly positioning?: PositionOptions;
}

/** Shared Menu controller reused by dropdown and context-menu factories. @public */
export interface MenuController extends RuntimeController<MenuSnapshot>, EventSource<MenuEvents> {
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
  closeAndRestore(event?: KeyboardEvent): void;
}

const parentMenuContexts = new WeakMap<MenuController, ParentMenuContext>();

/** Creates the shared headless Menu engine. @public */
export function createMenu(options: MenuOptions = {}): MenuController {
  const collection = createCollection<MenuItem>();
  const elements = new Map<string, HTMLElement>();
  const submenus = new Map<string, MenuController>();
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
      open: overlaySnapshot.open,
      controlled: overlaySnapshot.controlled,
      items: collection.items(),
      position: overlaySnapshot.position,
    });
  };
  host.resources.add(overlay.subscribe(sync));
  const openEventNames = [
    'beforeOpen',
    'open',
    'afterOpen',
    'beforeClose',
    'close',
    'afterClose',
  ] as const;
  for (const name of openEventNames) {
    host.resources.add(
      overlay.on(name, (event) => {
        if (!host.emit(name, event.detail)) event.preventDefault();
      }),
    );
  }
  host.resources.add(overlay.on('stateChange', (event) => host.emit('stateChange', event.detail)));
  const closeSubmenu = (restore = false): void => {
    const itemId = host.getSnapshot().activeId;
    const submenuId = host.getSnapshot().openSubmenuId;
    if (!submenuId) return;
    submenus.get(submenuId)?.close({ reason: 'programmatic' });
    host.update({ ...host.getSnapshot(), openSubmenuId: null });
    if (restore && itemId) focusById(elements, itemId);
  };
  host.resources.add(overlay.on('close', () => closeSubmenu()));
  const setActive = (id: string | null): void => {
    if (!host.alive() || host.getSnapshot().activeId === id) return;
    if (id && (collection.get(id)?.disabled || collection.get(id)?.kind === 'separator')) return;
    host.update({ ...host.getSnapshot(), activeId: id });
    focusById(elements, id ?? undefined);
  };
  const select = (
    id: string,
    selectDetails: ChangeDetails<MenuSelectReason> = { reason: 'programmatic' },
  ): void => {
    const item = collection.get(id);
    if (!item || item.disabled || item.kind === 'separator') return;
    if (item.submenuId && submenus.has(item.submenuId)) {
      setActive(id);
      const current = host.getSnapshot().openSubmenuId;
      if (current && current !== item.submenuId) submenus.get(current)?.close();
      host.update({ ...host.getSnapshot(), openSubmenuId: item.submenuId });
      submenus.get(item.submenuId)?.open({
        reason: selectDetails.reason === 'keyboard' ? 'keyboard' : 'trigger',
        ...(selectDetails.event ? { event: selectDetails.event } : {}),
      });
      return;
    }
    const payload = { item, details: selectDetails };
    if (!host.emit('beforeSelect', payload)) return;
    host.update({
      ...host.getSnapshot(),
      activeId: id,
      selectedId: id,
      openSubmenuId: item.submenuId ?? null,
    });
    host.emit('select', payload);
    host.emit('stateChange', payload);
    if (!item.submenuId && (options.closeOnSelect ?? true)) {
      overlay.close({
        reason: 'selection',
        ...(selectDetails.event ? { event: selectDetails.event } : {}),
      });
    }
  };
  const move = (delta: 1 | -1): void =>
    setActive(
      collection.move(host.getSnapshot().activeId ?? undefined, delta, options.loop ?? true) ??
        null,
    );
  const resetTypeahead = (): void => {
    typeahead = '';
  };
  host.resources.add(resetTypeahead);
  host.resources.add(typeaheadTimer.clear);
  host.resources.add(() => overlay.destroy());
  host.resources.add(() => collection.clear());
  const controller: MenuController = {
    getSnapshot: host.getSnapshot,
    subscribe: host.subscribe,
    on: host.on,
    off: host.off,
    once: host.once,
    open(changeDetails = { reason: 'programmatic' }) {
      overlay.open(changeDetails);
      if (overlay.getSnapshot().open) setActive(collection.edge('first') ?? null);
    },
    close: (changeDetails = { reason: 'programmatic' }) => overlay.close(changeDetails),
    toggle(changeDetails = { reason: 'programmatic' }) {
      overlay.toggle(changeDetails);
      if (!overlay.getSnapshot().open) setActive(null);
      else setActive(collection.edge('first') ?? null);
    },
    registerItem(item, element) {
      if (!host.alive()) return () => undefined;
      const kind = item.kind ?? 'item';
      const normalized: MenuItem = {
        ...item,
        kind,
        disabled: item.disabled ?? kind === 'separator',
      };
      const unregister = collection.register(normalized);
      if (element) elements.set(item.id, element);
      sync();
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        unregister();
        if (elements.get(item.id) === element) elements.delete(item.id);
        if (host.getSnapshot().activeId === item.id) {
          host.update({ ...host.getSnapshot(), activeId: collection.edge('first') ?? null });
        }
        sync();
      };
    },
    registerSubmenu(itemId, submenu) {
      if (!host.alive()) return () => undefined;
      const item = collection.get(itemId);
      if (!item?.submenuId) return () => undefined;
      const submenuId = item.submenuId;
      submenus.set(submenuId, submenu);
      parentMenuContexts.set(submenu, {
        closeAndRestore(event) {
          submenu.close(event ? { reason: 'keyboard', event } : { reason: 'programmatic' });
          if (host.getSnapshot().openSubmenuId === submenuId)
            host.update({ ...host.getSnapshot(), openSubmenuId: null });
          setActive(itemId);
          focusById(elements, itemId);
        },
      });
      const releaseClose = submenu.on('close', () => {
        if (host.getSnapshot().openSubmenuId === submenuId)
          host.update({ ...host.getSnapshot(), openSubmenuId: null });
        setActive(itemId);
        focusById(elements, itemId);
      });
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        releaseClose();
        if (submenus.get(submenuId) === submenu) submenus.delete(submenuId);
        parentMenuContexts.delete(submenu);
        if (host.getSnapshot().openSubmenuId === submenuId)
          host.update({ ...host.getSnapshot(), openSubmenuId: null });
      };
    },
    bind: overlay.bind,
    handleKeyDown(event) {
      if (!host.alive() || !overlay.getSnapshot().open) return;
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
        if (active && submenuId && submenus.has(submenuId))
          select(active, { reason: 'keyboard', event });
      } else if (event.key === 'ArrowLeft') {
        const parentContext = parentMenuContexts.get(controller);
        if (parentContext) parentContext.closeAndRestore(event);
        else closeSubmenu(true);
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
    closeSubmenu();
    for (const submenu of submenus.values()) parentMenuContexts.delete(submenu);
    submenus.clear();
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
  return {
    ...menu,
    handleTrigger(event) {
      const keyboard = isKeyboardLikeEvent(event);
      if (keyboard && !['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      menu.open({ reason: keyboard ? 'keyboard' : 'trigger', event });
      if (keyboard && event.key === 'ArrowUp') {
        const last = [...menu.getSnapshot().items]
          .reverse()
          .find((item) => !item.disabled && item.kind !== 'separator');
        menu.setActive(last?.id ?? null);
      }
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
  ): (() => void) => {
    unbind();
    unbind = menu.bind({ anchor, trigger, content });
    menu.open({ reason: 'context-menu' });
    return unbind;
  };
  return {
    ...menu,
    handleContextMenu(event, content) {
      if (destroyed || !isHTMLElement(event.currentTarget)) return () => undefined;
      event.preventDefault();
      const anchor: VirtualAnchor = {
        contextElement: event.currentTarget,
        getBoundingClientRect: () => ({ x: event.clientX, y: event.clientY, width: 0, height: 0 }),
      };
      return bindAt(anchor, event.currentTarget, content);
    },
    handleKeyboardOpen(event, trigger, content) {
      if (!(event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')))
        return () => undefined;
      event.preventDefault();
      return bindAt(trigger, trigger, content);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unbind();
      menu.destroy();
    },
  };
}
