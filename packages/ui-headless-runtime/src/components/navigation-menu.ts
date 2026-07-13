import type { CollectionItem } from '../collections/collection';
import { createControllerHost } from '../core/host';
import { createTimeoutManager } from '../core/timers';
import type {
  ChangeDetails,
  ControllableValueOptions,
  RuntimeController,
  RuntimeEventSource,
} from '../core/types';
import type { FloatingPositionOptions, PositionResult } from '../positioning/positioning';
import { createControllableValue } from '../state/controllable';
import { createDisclosure, type DisclosureController } from './disclosure';
import { createMenu, type MenuOptions } from './menu';
import type { OpenChangeReason, OverlayElements } from './openable';

/** Consumer-selected Navigation Menu presentation mode. @public */
export type NavigationMenuMode = 'desktop' | 'compact';

/** Causes of Navigation Menu open-item changes. @public */
export type NavigationMenuReason =
  'programmatic' | 'pointer' | 'keyboard' | 'outside-pointer' | 'focus-out';

/** Navigation item registration supporting simple links and mega-menu content. @public */
export interface NavigationMenuItem extends CollectionItem {
  /** Whether the item controls nested or mega-menu content. */
  readonly hasContent?: boolean;
}

/** Immutable Navigation Menu snapshot. @public */
export interface NavigationMenuSnapshot {
  /** Stable shared-content ID used by trigger `aria-controls` relationships. */
  readonly contentId: string;
  /** Consumer-controlled responsive presentation mode. */
  readonly mode: NavigationMenuMode;
  /** Item whose nested content is open. */
  readonly openId: string | null;
  /** Keyboard-active navigation item. */
  readonly activeId: string | null;
  /** Whether open-item state is consumer-owned. */
  readonly controlled: boolean;
  /** Ordered navigation items. */
  readonly items: readonly Readonly<NavigationMenuItem>[];
  /** Shared floating-content position. */
  readonly position: PositionResult | null;
}

/** Navigation Menu lifecycle payload. @public */
export interface NavigationMenuEvent {
  /** Item being opened or closed. */
  readonly item: Readonly<NavigationMenuItem>;
  /** Next item ID or `null`. */
  readonly openId: string | null;
  /** Typed cause and optional native event. */
  readonly details: ChangeDetails<NavigationMenuReason>;
}

/** Navigation Menu event map. @public */
export interface NavigationMenuEvents {
  /** Cancellable event emitted before nested content opens. */
  readonly beforeOpen: NavigationMenuEvent;
  /** Event emitted after nested content opens. */
  readonly open: NavigationMenuEvent;
  /** Cancellable event emitted before nested content closes. */
  readonly beforeClose: NavigationMenuEvent;
  /** Event emitted after nested content closes. */
  readonly close: NavigationMenuEvent;
  /** Event emitted for every accepted open-item mutation. */
  readonly stateChange: NavigationMenuEvent;
}

/** Navigation Menu options. @public */
export interface NavigationMenuOptions extends Partial<
  ControllableValueOptions<string | null, NavigationMenuReason>
> {
  /** Consumer-provided deterministic shared-content ID. */
  readonly id?: string;
  /** Initial consumer-selected responsive mode. @defaultValue `desktop` */
  readonly mode?: NavigationMenuMode;
  /** Pointer open delay in desktop mode. @defaultValue `150` */
  readonly openDelay?: number;
  /** Pointer close delay in desktop mode. @defaultValue `200` */
  readonly closeDelay?: number;
  /** Shared floating-content positioning options. */
  readonly positioning?: FloatingPositionOptions;
}

/** Headless responsive Navigation Menu controller. @public */
export interface NavigationMenuController
  extends RuntimeController<NavigationMenuSnapshot>, RuntimeEventSource<NavigationMenuEvents> {
  /** Registers a simple or content-bearing navigation item. */
  registerItem(item: NavigationMenuItem, element?: HTMLElement): () => void;
  /** Binds shared nested content for outside interaction and positioning. */
  bind(elements: OverlayElements): () => void;
  /** Opens content immediately with a typed cause. */
  openItem(id: string, details?: ChangeDetails<NavigationMenuReason>): void;
  /** Closes currently open content. */
  close(details?: ChangeDetails<NavigationMenuReason>): void;
  /** Schedules desktop pointer opening; compact mode opens immediately. */
  scheduleOpen(id: string, event?: PointerEvent): void;
  /** Schedules desktop pointer closing; compact mode closes immediately. */
  scheduleClose(event?: PointerEvent): void;
  /** Handles navigation and Escape, inferring the item from a registered event current target. */
  handleKeyDown(event: KeyboardEvent): void;
  /** Handles navigation and opening for an explicitly identified registered item. */
  handleKeyDown(itemId: string, event: KeyboardEvent): void;
  /** Updates consumer-controlled responsive mode without reading viewport globals. */
  setMode(mode: NavigationMenuMode): void;
}

/** Creates a Navigation Menu from Menu, Disclosure, and shared Positioning primitives. @public */
export function createNavigationMenu(
  options: NavigationMenuOptions = {},
): NavigationMenuController {
  let mode = options.mode ?? 'desktop';
  const menuOptions: MenuOptions = {
    closeOnSelect: false,
    ...(options.id ? { id: options.id } : {}),
    ...(options.positioning ? { positioning: options.positioning } : {}),
  };
  const menu = createMenu(menuOptions);
  const items = new Map<string, { readonly item: NavigationMenuItem; readonly token: symbol }>();
  const itemElements = new Map<string, HTMLElement>();
  let activeBinding:
    | {
        readonly branches: Element[];
        readonly explicitBranches: readonly Element[];
        readonly elements: OverlayElements;
        release: (() => void) | undefined;
      }
    | undefined;
  const disclosures = new Map<string, DisclosureController>();
  const timer = createTimeoutManager();
  const initialMenu = menu.getSnapshot();
  const initialOpenId = options.getValue?.() ?? options.defaultValue ?? null;
  let bypassMenuBeforeClose = false;
  const host = createControllerHost<NavigationMenuSnapshot, NavigationMenuEvents>({
    contentId: initialMenu.contentId,
    mode,
    openId: initialOpenId,
    activeId: initialMenu.activeId,
    controlled: options.getValue !== undefined,
    items: [],
    position: initialMenu.position,
  });
  const clearTimer = timer.clear;
  const itemFor = (id: string | null | undefined): NavigationMenuItem | undefined =>
    id ? items.get(id)?.item : undefined;
  const isOpenableItem = (item: NavigationMenuItem | undefined): item is NavigationMenuItem =>
    Boolean(item?.hasContent && !item.disabled);
  const effectiveOpenId = (): string | null => {
    const openId = state.get();
    return isOpenableItem(itemFor(openId)) ? openId : null;
  };
  const refreshBindingBranches = (openId = effectiveOpenId()): void => {
    if (!activeBinding) return;
    const branches = new Set([...activeBinding.explicitBranches, ...itemElements.values()]);
    activeBinding.branches.splice(0, activeBinding.branches.length, ...branches);
    const activeElement = openId ? itemElements.get(openId) : undefined;
    activeBinding.release?.();
    activeBinding.release = menu.bind({
      ...activeBinding.elements,
      ...(activeElement ? { trigger: activeElement, anchor: activeElement } : {}),
      branches: activeBinding.branches,
    });
  };
  const sync = (): void => {
    const menuSnapshot = menu.getSnapshot();
    host.update({
      contentId: menuSnapshot.contentId,
      mode,
      openId: effectiveOpenId(),
      activeId: menuSnapshot.activeId,
      controlled: state.controlled,
      items: Object.freeze([...items.values()].map(({ item }) => item)),
      position: menuSnapshot.position,
    });
  };
  const closeMenu = (details: ChangeDetails<OpenChangeReason>): void => {
    bypassMenuBeforeClose = true;
    try {
      menu.close(details);
    } finally {
      bypassMenuBeforeClose = false;
    }
  };
  const commit = (
    openId: string | null,
    changeDetails?: ChangeDetails<NavigationMenuReason>,
  ): void => {
    const previousId = host.getSnapshot().openId;
    const nextOpenId = isOpenableItem(itemFor(openId)) ? openId : null;
    if (previousId && previousId !== nextOpenId)
      disclosures.get(previousId)?.collapse({ reason: 'programmatic' });
    if (nextOpenId) {
      disclosures.get(nextOpenId)?.expand({ reason: 'programmatic' });
      refreshBindingBranches(nextOpenId);
      menu.open({
        reason: changeDetails?.reason === 'keyboard' ? 'keyboard' : 'trigger',
        ...(changeDetails?.event ? { event: changeDetails.event } : {}),
      });
      menu.setActive(nextOpenId);
    } else {
      closeMenu({
        reason:
          changeDetails?.reason === 'outside-pointer' || changeDetails?.reason === 'focus-out'
            ? changeDetails.reason
            : 'programmatic',
        ...(changeDetails?.event ? { event: changeDetails.event } : {}),
      });
      refreshBindingBranches(null);
    }
    sync();
    if (!changeDetails) return;
    const item = itemFor(nextOpenId ?? previousId);
    if (!item) return;
    const payload = { item, openId: nextOpenId, details: changeDetails };
    host.emit(nextOpenId ? 'open' : 'close', payload);
    host.emit('stateChange', payload);
  };
  const state = createControllableValue<string | null, NavigationMenuReason>(
    {
      defaultValue: options.defaultValue ?? null,
      ...(options.getValue ? { getValue: options.getValue } : {}),
      ...(options.onValueChange ? { onValueChange: options.onValueChange } : {}),
      ...(options.subscribeValue ? { subscribeValue: options.subscribeValue } : {}),
    },
    commit,
  );
  const change = (
    openId: string | null,
    changeDetails: ChangeDetails<NavigationMenuReason>,
  ): boolean => {
    if (state.get() === openId) return effectiveOpenId() === openId;
    const previousId = state.get();
    const item = itemFor(openId ?? previousId);
    if (!item || (openId !== null && !isOpenableItem(item))) return false;
    const payload = { item, openId, details: changeDetails };
    if (!host.emit(openId ? 'beforeOpen' : 'beforeClose', payload)) return false;
    if (state.set(openId, changeDetails)) commit(openId, changeDetails);
    else sync();
    return effectiveOpenId() === openId;
  };
  const handleKeyDown = (
    itemOrEvent: string | KeyboardEvent,
    providedEvent?: KeyboardEvent,
  ): void => {
    if (!host.alive()) return;
    const event = typeof itemOrEvent === 'string' ? providedEvent : itemOrEvent;
    if (!event) return;
    const inferredId =
      typeof itemOrEvent === 'string'
        ? itemOrEvent
        : [...itemElements].find(([, element]) => element === event.currentTarget)?.[0];
    const itemId = inferredId ?? menu.getSnapshot().activeId;
    const item = itemFor(itemId);
    if (itemId && (!item || item.disabled)) return;
    if (itemId) menu.setActive(itemId);

    const opensFromTrigger =
      event.key === 'Enter' ||
      event.key === ' ' ||
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp';
    if (!menu.getSnapshot().open && itemId && item?.hasContent && opensFromTrigger) {
      event.preventDefault();
      change(itemId, { reason: 'keyboard', event });
      return;
    }

    if (menu.getSnapshot().open && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      const enabled = [...items.values()]
        .map(({ item: candidate }) => candidate)
        .filter((candidate) => !candidate.disabled);
      if (enabled.length === 0) return;
      const currentIndex = enabled.findIndex((candidate) => candidate.id === itemId);
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const next = enabled[(currentIndex + delta + enabled.length) % enabled.length];
      if (next) {
        event.preventDefault();
        if (next.hasContent) change(next.id, { reason: 'keyboard', event });
        else if (change(null, { reason: 'keyboard', event })) {
          menu.setActive(next.id);
        }
      }
      return;
    }

    if (item && !item.hasContent && (event.key === 'Enter' || event.key === ' ')) return;

    menu.handleKeyDown(event);
    if (event.key === 'Escape') return;
    const activeId = menu.getSnapshot().activeId;
    if (opensFromTrigger && activeId && itemFor(activeId)?.hasContent) {
      change(activeId, { reason: 'keyboard', event });
    }
  };
  host.resources.add(menu.subscribe(sync));
  host.resources.add(
    menu.on('beforeClose', (event) => {
      if (bypassMenuBeforeClose || state.get() === null) return;
      event.preventDefault();
      const reason: NavigationMenuReason =
        event.detail.details.reason === 'escape-key'
          ? 'keyboard'
          : event.detail.details.reason === 'focus-out'
            ? 'focus-out'
            : 'outside-pointer';
      change(null, {
        reason,
        ...(event.detail.details.event ? { event: event.detail.details.event } : {}),
      });
    }),
  );
  host.resources.add(clearTimer);
  host.resources.add(() => state.destroy());
  host.resources.add(() => menu.destroy());
  host.resources.add(() => {
    disclosures.forEach((disclosure) => disclosure.destroy());
    disclosures.clear();
  });
  host.resources.add(() => items.clear());
  host.resources.add(() => itemElements.clear());
  host.resources.add(() => {
    activeBinding = undefined;
  });
  return {
    getSnapshot: host.getSnapshot,
    subscribe: host.subscribe,
    on: host.on,
    off: host.off,
    once: host.once,
    registerItem(item, element) {
      if (!host.alive()) return () => undefined;
      const token = Symbol(item.id);
      const registeredItem = Object.freeze({ ...item });
      items.set(item.id, { item: registeredItem, token });
      if (element) itemElements.set(item.id, element);
      else itemElements.delete(item.id);
      refreshBindingBranches();
      const unregisterMenu = menu.registerItem(item, element);
      disclosures.get(item.id)?.destroy();
      const disclosure = createDisclosure({
        defaultValue: state.get() === item.id,
        ...(item.disabled !== undefined ? { disabled: item.disabled } : {}),
      });
      disclosures.set(item.id, disclosure);
      if (state.get() === item.id && isOpenableItem(registeredItem)) commit(item.id);
      else if (state.get() === item.id) {
        const changeDetails: ChangeDetails<NavigationMenuReason> = { reason: 'programmatic' };
        if (state.set(null, changeDetails)) commit(null, changeDetails);
        else {
          closeMenu({ reason: 'programmatic' });
          sync();
        }
      } else sync();
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        unregisterMenu();
        disclosure.destroy();
        if (items.get(item.id)?.token !== token) return;
        if (state.get() === item.id) {
          const changeDetails: ChangeDetails<NavigationMenuReason> = { reason: 'programmatic' };
          if (state.set(null, changeDetails)) commit(null, changeDetails);
        }
        if (disclosures.get(item.id) === disclosure) disclosures.delete(item.id);
        itemElements.delete(item.id);
        items.delete(item.id);
        refreshBindingBranches();
        if (host.getSnapshot().openId === item.id || !itemFor(state.get())) {
          closeMenu({ reason: 'programmatic' });
        }
        sync();
      };
    },
    bind(elements) {
      if (!host.alive()) return () => undefined;
      const explicitBranches = elements.branches ?? [];
      const branches: Element[] = [];
      const binding: NonNullable<typeof activeBinding> = {
        branches,
        explicitBranches,
        elements,
        release: undefined,
      };
      activeBinding = binding;
      refreshBindingBranches();
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        binding.release?.();
        binding.release = undefined;
        if (activeBinding === binding) activeBinding = undefined;
      };
    },
    openItem(id, changeDetails = { reason: 'programmatic' }) {
      clearTimer();
      change(id, changeDetails);
    },
    close(changeDetails = { reason: 'programmatic' }) {
      clearTimer();
      change(null, changeDetails);
    },
    scheduleOpen(id, event) {
      if (!host.alive()) return;
      clearTimer();
      const run = () => change(id, event ? { reason: 'pointer', event } : { reason: 'pointer' });
      if (mode === 'compact' || (options.openDelay ?? 150) === 0) run();
      else timer.schedule(run, options.openDelay ?? 150);
    },
    scheduleClose(event) {
      if (!host.alive()) return;
      clearTimer();
      const run = () => change(null, event ? { reason: 'pointer', event } : { reason: 'pointer' });
      if (mode === 'compact' || (options.closeDelay ?? 200) === 0) run();
      else timer.schedule(run, options.closeDelay ?? 200);
    },
    handleKeyDown,
    setMode(nextMode) {
      if (!host.alive()) return;
      if (mode === nextMode) return;
      mode = nextMode;
      clearTimer();
      sync();
    },
    destroy: host.destroy,
  };
}
