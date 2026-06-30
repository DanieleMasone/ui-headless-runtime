import { createControllerHost } from '../core/host';
import { createTimeoutManager } from '../core/timers';
import type {
  ChangeDetails,
  ControllableValueOptions,
  EventSource,
  RuntimeController,
} from '../core/types';
import type { PositionOptions, PositionResult } from '../positioning/positioning';
import { createControllableValue } from '../state/controllable';
import { createDisclosure, type DisclosureController } from './disclosure';
import { createMenu, type MenuItem, type MenuOptions } from './menu';
import type { OverlayElements } from './openable';

/** Consumer-selected Navigation Menu presentation mode. @public */
export type NavigationMenuMode = 'desktop' | 'compact';

/** Causes of Navigation Menu open-item changes. @public */
export type NavigationMenuReason = 'programmatic' | 'pointer' | 'keyboard' | 'outside-pointer';

/** Navigation item registration supporting simple links and mega-menu content. @public */
export interface NavigationMenuItem extends MenuItem {
  /** Whether the item controls nested or mega-menu content. */
  readonly hasContent?: boolean;
}

/** Immutable Navigation Menu snapshot. @public */
export interface NavigationMenuSnapshot {
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
  /** Initial consumer-selected responsive mode. @defaultValue `desktop` */
  readonly mode?: NavigationMenuMode;
  /** Pointer open delay in desktop mode. @defaultValue `150` */
  readonly openDelay?: number;
  /** Pointer close delay in desktop mode. @defaultValue `200` */
  readonly closeDelay?: number;
  /** Shared floating-content positioning options. */
  readonly positioning?: PositionOptions;
}

/** Headless responsive Navigation Menu controller. @public */
export interface NavigationMenuController
  extends RuntimeController<NavigationMenuSnapshot>, EventSource<NavigationMenuEvents> {
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
  /** Delegates menu keyboard navigation and handles content open/close keys. */
  handleKeyDown(event: KeyboardEvent): void;
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
    ...(options.positioning ? { positioning: options.positioning } : {}),
  };
  const menu = createMenu(menuOptions);
  const items = new Map<string, NavigationMenuItem>();
  const disclosures = new Map<string, DisclosureController>();
  const timer = createTimeoutManager();
  const initialMenu = menu.getSnapshot();
  const host = createControllerHost<NavigationMenuSnapshot, NavigationMenuEvents>({
    mode,
    openId: options.defaultValue ?? null,
    activeId: initialMenu.activeId,
    controlled: options.getValue !== undefined,
    items: [],
    position: initialMenu.position,
  });
  const clearTimer = timer.clear;
  const sync = (): void => {
    const menuSnapshot = menu.getSnapshot();
    host.update({
      mode,
      openId: state.get(),
      activeId: menuSnapshot.activeId,
      controlled: state.controlled,
      items: Object.freeze([...items.values()]),
      position: menuSnapshot.position,
    });
  };
  const state = createControllableValue<string | null, NavigationMenuReason>(
    {
      defaultValue: options.defaultValue ?? null,
      ...(options.getValue ? { getValue: options.getValue } : {}),
      ...(options.onValueChange ? { onValueChange: options.onValueChange } : {}),
      ...(options.subscribeValue ? { subscribeValue: options.subscribeValue } : {}),
    },
    sync,
  );
  const change = (
    openId: string | null,
    changeDetails: ChangeDetails<NavigationMenuReason>,
  ): void => {
    if (state.get() === openId) return;
    const previousId = state.get();
    const item = items.get(openId ?? previousId ?? '');
    if (!item || item.disabled) return;
    const payload = { item, openId, details: changeDetails };
    if (!host.emit(openId ? 'beforeOpen' : 'beforeClose', payload)) return;
    if (previousId) disclosures.get(previousId)?.collapse({ reason: 'programmatic' });
    state.set(openId, changeDetails);
    if (openId) {
      disclosures.get(openId)?.expand({ reason: 'programmatic' });
      menu.open({
        reason: changeDetails.reason === 'keyboard' ? 'keyboard' : 'trigger',
        ...(changeDetails.event ? { event: changeDetails.event } : {}),
      });
    } else
      menu.close({
        reason: changeDetails.reason === 'outside-pointer' ? 'outside-pointer' : 'programmatic',
        ...(changeDetails.event ? { event: changeDetails.event } : {}),
      });
    sync();
    host.emit(openId ? 'open' : 'close', payload);
    host.emit('stateChange', payload);
  };
  host.resources.add(menu.subscribe(sync));
  host.resources.add(
    menu.on('close', (event) => {
      if (state.get() === null) return;
      const reason: NavigationMenuReason =
        event.detail.details.reason === 'escape-key' ? 'keyboard' : 'outside-pointer';
      change(null, {
        reason,
        ...(event.detail.details.event ? { event: event.detail.details.event } : {}),
      });
    }),
  );
  host.resources.add(clearTimer);
  host.resources.add(() => state.destroy());
  host.resources.add(() => menu.destroy());
  host.resources.add(() => disclosures.forEach((disclosure) => disclosure.destroy()));
  host.resources.add(() => items.clear());
  return {
    getSnapshot: host.getSnapshot,
    subscribe: host.subscribe,
    on: host.on,
    off: host.off,
    once: host.once,
    registerItem(item, element) {
      if (!host.alive()) return () => undefined;
      items.set(item.id, Object.freeze({ ...item }));
      const unregisterMenu = menu.registerItem(item, element);
      const disclosure = createDisclosure({
        defaultValue: state.get() === item.id,
        ...(item.disabled !== undefined ? { disabled: item.disabled } : {}),
      });
      disclosures.set(item.id, disclosure);
      sync();
      return () => {
        unregisterMenu();
        disclosure.destroy();
        if (disclosures.get(item.id) === disclosure) disclosures.delete(item.id);
        if (items.get(item.id)?.text === item.text) items.delete(item.id);
        if (state.get() === item.id) state.set(null, { reason: 'programmatic' });
        sync();
      };
    },
    bind: menu.bind,
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
    handleKeyDown(event) {
      if (!host.alive()) return;
      menu.handleKeyDown(event);
      const activeId = menu.getSnapshot().activeId;
      if (
        (event.key === 'Enter' || event.key === 'ArrowDown') &&
        activeId &&
        items.get(activeId)?.hasContent
      ) {
        change(activeId, { reason: 'keyboard', event });
      } else if (event.key === 'Escape') change(null, { reason: 'keyboard', event });
    },
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
