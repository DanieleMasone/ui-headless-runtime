/**
 * Framework-agnostic headless UI controllers, positioning utilities, and public types.
 *
 * @remarks
 * The package owns state transitions and behavior but never renders markup or ships CSS. Consumers
 * bind optional DOM resources after rendering and must release bindings, subscriptions, and
 * controllers during unmount. Importing the package does not require browser globals.
 *
 * @packageDocumentation
 */

export type {
  ChangeDetails,
  ControllableValueOptions,
  RuntimeController,
  RuntimeEvent,
  RuntimeEventListener,
  RuntimeEventSource,
  SnapshotListener,
  Unsubscribe,
} from './core/types';
export type { CollectionItem } from './collections/collection';
export { hasDOM } from './dom/dom';
export {
  autoUpdatePosition,
  calculatePosition,
  createVirtualAnchor,
  type AnchorRect,
  type Placement,
  type FloatingPositionOptions,
  type PositionResult,
  type VirtualAnchor,
} from './positioning/positioning';
export type {
  OpenChangeEvent,
  OpenChangeReason,
  OpenLifecycleEvents,
  OpenSnapshot,
  OverlayElements,
} from './components/openable';
export {
  createDisclosure,
  createCollapsible,
  type CollapsibleController,
  type DisclosureChangeEvent,
  type DisclosureChangeReason,
  type DisclosureController,
  type DisclosureEvents,
  type DisclosureOptions,
  type DisclosurePanelProps,
  type DisclosureSnapshot,
  type DisclosureTriggerProps,
} from './components/disclosure';
export {
  createDialog,
  type DialogController,
  type DialogOptions,
  type DialogSnapshot,
} from './components/dialog';
export { createPopover, type PopoverController, type PopoverOptions } from './components/popover';
export {
  createContextMenu,
  createDropdownMenu,
  createMenu,
  type ContextMenuController,
  type DropdownMenuController,
  type MenuController,
  type MenuEvents,
  type MenuItem,
  type MenuItemKind,
  type MenuOptions,
  type MenuSelectEvent,
  type MenuSelectReason,
  type MenuSnapshot,
} from './components/menu';
export {
  createAccordion,
  type AccordionChangeEvent,
  type AccordionChangeReason,
  type AccordionController,
  type AccordionEvents,
  type AccordionItem,
  type AccordionItemSnapshot,
  type AccordionOptions,
  type AccordionSnapshot,
  type AccordionType,
} from './components/accordion';
export {
  createTabs,
  type TabItem,
  type TabItemSnapshot,
  type TabsActivation,
  type TabsChangeEvent,
  type TabsChangeReason,
  type TabsController,
  type TabsEvents,
  type TabsOptions,
  type TabsOrientation,
  type TabsSnapshot,
} from './components/tabs';
export {
  createListbox,
  type ListboxChangeReason,
  type ListboxController,
  type ListboxEvents,
  type ListboxOption,
  type ListboxOptionSnapshot,
  type ListboxOptions,
  type ListboxSelectionMode,
  type ListboxSelectEvent,
  type ListboxSnapshot,
} from './components/listbox';
export {
  createCombobox,
  type ComboboxController,
  type ComboboxEvents,
  type ComboboxInputReason,
  type ComboboxOption,
  type ComboboxOptions,
  type ComboboxQueryEvent,
  type ComboboxSelectReason,
  type ComboboxSelectEvent,
  type ComboboxSnapshot,
} from './components/combobox';
export {
  createTooltip,
  type TooltipController,
  type TooltipOptions,
  type TooltipSnapshot,
} from './components/tooltip';
export {
  createToast,
  type ToastChangeReason,
  type ToastController,
  type ToastEvent,
  type ToastEvents,
  type ToastInput,
  type ToastOptions,
  type ToastPoliteness,
  type ToastPromiseMessages,
  type ToastRecord,
  type ToastSnapshot,
  type ToastStatus,
} from './components/toast';
export {
  createCommandPalette,
  type CommandItem,
  type CommandPaletteController,
  type CommandPaletteEvents,
  type CommandPaletteOptions,
  type CommandPaletteQueryEvent,
  type CommandPaletteReason,
  type CommandPaletteSelectEvent,
  type CommandPaletteSnapshot,
  type CommandShortcut,
} from './components/command-palette';
export {
  createTreeView,
  type TreeChangeEvent,
  type TreeChangeReason,
  type TreeController,
  type TreeEvents,
  type TreeNode,
  type TreeNodeSnapshot,
  type TreeOptions,
  type TreeSnapshot,
} from './components/tree';
export {
  createNavigationMenu,
  type NavigationMenuController,
  type NavigationMenuEvent,
  type NavigationMenuEvents,
  type NavigationMenuItem,
  type NavigationMenuMode,
  type NavigationMenuOptions,
  type NavigationMenuReason,
  type NavigationMenuSnapshot,
} from './components/navigation-menu';
