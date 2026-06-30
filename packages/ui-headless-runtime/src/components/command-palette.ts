import { createCollection, fuzzyScore, type CollectionItem } from '../collections/collection';
import { createControllerHost } from '../core/host';
import type { ChangeDetails, EventSource, RuntimeController } from '../core/types';
import { listen } from '../dom/dom';
import { createControllableValue } from '../state/controllable';
import { createDialog, type DialogOptions } from './dialog';
import type { OpenChangeEvent, OpenLifecycleEvents, OverlayElements } from './openable';

/** Registered command metadata and action. @public */
export interface CommandItem extends CollectionItem {
  /** Optional visual grouping label. */
  readonly group?: string;
  /** Additional searchable terms. */
  readonly keywords?: readonly string[];
  /** Action invoked after a non-cancelled selection. */
  readonly perform: () => void | Promise<void>;
}

/** Configurable global command-palette shortcut. @public */
export interface CommandShortcut {
  /** KeyboardEvent key value. @defaultValue `k` */
  readonly key?: string;
  /** Requires Control on Windows/Linux or Meta on macOS. @defaultValue `true` */
  readonly ctrlOrMeta?: boolean;
  /** Requires Alt when true. */
  readonly alt?: boolean;
  /** Requires Shift when true. */
  readonly shift?: boolean;
}

/** Causes of Command Palette query and selection changes. @public */
export type CommandPaletteReason = 'programmatic' | 'input' | 'keyboard' | 'pointer' | 'shortcut';

/** Immutable Command Palette snapshot. @public */
export interface CommandPaletteSnapshot {
  /** Modal dialog open state. */
  readonly open: boolean;
  /** Current search query. */
  readonly query: string;
  /** Keyboard-active command ID. */
  readonly activeId: string | null;
  /** Score-ordered matching commands. */
  readonly commands: readonly Readonly<CommandItem>[];
  /** Whether no enabled command matches the query. */
  readonly empty: boolean;
  /** Whether query state is consumer-owned. */
  readonly queryControlled: boolean;
  /** Whether open state is consumer-owned. */
  readonly openControlled: boolean;
}

/** Command Palette selection payload. @public */
export interface CommandPaletteSelectEvent {
  /** Selected command. */
  readonly command: Readonly<CommandItem>;
  /** Typed cause and optional native event. */
  readonly details: ChangeDetails<CommandPaletteReason>;
}

/** Command Palette query payload. @public */
export interface CommandPaletteQueryEvent {
  /** Next query. */
  readonly query: string;
  /** Typed cause and optional native event. */
  readonly details: ChangeDetails<CommandPaletteReason>;
}

/** Command Palette event map. @public */
export interface CommandPaletteEvents extends Omit<OpenLifecycleEvents, 'stateChange'> {
  /** Cancellable event emitted before command invocation. */
  readonly beforeSelect: CommandPaletteSelectEvent;
  /** Event emitted after command invocation is started. */
  readonly select: CommandPaletteSelectEvent;
  /** Event emitted after query changes. */
  readonly queryChange: CommandPaletteQueryEvent;
  /** Event emitted for open, query, active-command, or selection changes. */
  readonly stateChange: OpenChangeEvent | CommandPaletteSelectEvent | CommandPaletteQueryEvent;
}

/** Command Palette configuration. @public */
export interface CommandPaletteOptions {
  /** Dialog state and focus configuration. */
  readonly dialog?: DialogOptions;
  /** Global shortcut configuration. */
  readonly shortcut?: CommandShortcut;
  /** Initial query in uncontrolled mode. */
  readonly defaultQuery?: string;
  /** Reads consumer-owned query. */
  readonly getQuery?: () => string;
  /** Receives query change requests. */
  readonly onQueryChange?: (query: string, details: ChangeDetails<CommandPaletteReason>) => void;
  /** Subscribes to external query changes. */
  readonly subscribeQuery?: (listener: () => void) => () => void;
  /** Replaces the default ordered fuzzy score. */
  readonly matcher?: (command: Readonly<CommandItem>, query: string) => number;
}

/** Headless Command Palette controller. @public */
export interface CommandPaletteController
  extends RuntimeController<CommandPaletteSnapshot>, EventSource<CommandPaletteEvents> {
  /** Registers a dynamic command and returns scoped cleanup. */
  registerCommand(command: CommandItem): () => void;
  /** Binds consumer-rendered modal dialog DOM. */
  bind(elements: OverlayElements): () => void;
  /** Registers the configured global shortcut on an explicit owner document. */
  bindShortcut(ownerDocument: Document): () => void;
  /** Opens the palette. */
  open(details?: ChangeDetails<CommandPaletteReason>): void;
  /** Closes the palette. */
  close(details?: ChangeDetails<CommandPaletteReason>): void;
  /** Updates query and active command. */
  setQuery(query: string, details?: ChangeDetails<CommandPaletteReason>): void;
  /** Handles navigation, activation, and Escape. */
  handleKeyDown(event: KeyboardEvent): void;
  /** Invokes an enabled command and closes after successful dispatch. */
  select(id: string, details?: ChangeDetails<CommandPaletteReason>): void;
}

/** Creates a modal Command Palette using the shared Dialog, collection, and fuzzy-search layers. @public */
export function createCommandPalette(
  options: CommandPaletteOptions = {},
): CommandPaletteController {
  const collection = createCollection<CommandItem>();
  const dialog = createDialog({ modal: true, ...(options.dialog ?? {}) });
  let activeId: string | null = null;
  let commands: readonly CommandItem[] = [];
  const matcher =
    options.matcher ??
    ((command: Readonly<CommandItem>, query: string) =>
      fuzzyScore(`${command.text} ${(command.keywords ?? []).join(' ')}`, query));
  const filter = (query: string): readonly CommandItem[] =>
    Object.freeze(
      collection
        .items()
        .map((command) => ({ command, score: matcher(command, query) }))
        .filter(({ score }) => score > Number.NEGATIVE_INFINITY)
        .sort((a, b) => b.score - a.score)
        .map(({ command }) => command),
    );
  const host = createControllerHost<CommandPaletteSnapshot, CommandPaletteEvents>({
    open: dialog.getSnapshot().open,
    query: options.defaultQuery ?? '',
    activeId,
    commands,
    empty: true,
    queryControlled: options.getQuery !== undefined,
    openControlled: dialog.getSnapshot().controlled,
  });
  const sync = (): void => {
    commands = filter(queryState.get());
    if (!commands.some((command) => command.id === activeId && !command.disabled)) {
      activeId = commands.find((command) => !command.disabled)?.id ?? null;
    }
    const dialogSnapshot = dialog.getSnapshot();
    host.update({
      open: dialogSnapshot.open,
      query: queryState.get(),
      activeId,
      commands,
      empty: commands.every((command) => command.disabled),
      queryControlled: queryState.controlled,
      openControlled: dialogSnapshot.controlled,
    });
  };
  const queryState = createControllableValue<string, CommandPaletteReason>(
    {
      defaultValue: options.defaultQuery ?? '',
      ...(options.getQuery ? { getValue: options.getQuery } : {}),
      ...(options.onQueryChange ? { onValueChange: options.onQueryChange } : {}),
      ...(options.subscribeQuery ? { subscribeValue: options.subscribeQuery } : {}),
    },
    sync,
  );
  host.resources.add(dialog.subscribe(sync));
  const openEvents = [
    'beforeOpen',
    'open',
    'afterOpen',
    'beforeClose',
    'close',
    'afterClose',
  ] as const;
  for (const name of openEvents) {
    host.resources.add(
      dialog.on(name, (event) => {
        if (!host.emit(name, event.detail)) event.preventDefault();
      }),
    );
  }
  host.resources.add(dialog.on('stateChange', (event) => host.emit('stateChange', event.detail)));
  const setQuery = (
    query: string,
    changeDetails: ChangeDetails<CommandPaletteReason> = { reason: 'programmatic' },
  ): void => {
    if (!host.alive() || queryState.get() === query) return;
    queryState.set(query, changeDetails);
    sync();
    const payload = { query, details: changeDetails };
    host.emit('queryChange', payload);
    host.emit('stateChange', payload);
  };
  const select = (
    id: string,
    changeDetails: ChangeDetails<CommandPaletteReason> = { reason: 'programmatic' },
  ): void => {
    if (!host.alive()) return;
    const command = collection.get(id);
    if (!command || command.disabled) return;
    const payload = { command, details: changeDetails };
    if (!host.emit('beforeSelect', payload)) return;
    const result = command.perform();
    if (result instanceof Promise) void result.catch(() => undefined);
    host.emit('select', payload);
    host.emit('stateChange', payload);
    dialog.close({
      reason: 'selection',
      ...(changeDetails.event ? { event: changeDetails.event } : {}),
    });
  };
  host.resources.add(() => queryState.destroy());
  host.resources.add(() => collection.clear());
  host.resources.add(() => dialog.destroy());
  sync();
  return {
    getSnapshot: host.getSnapshot,
    subscribe: host.subscribe,
    on: host.on,
    off: host.off,
    once: host.once,
    registerCommand(command) {
      if (!host.alive()) return () => undefined;
      const unregister = collection.register(Object.freeze({ ...command }));
      sync();
      return () => {
        unregister();
        sync();
      };
    },
    bind: dialog.bind,
    bindShortcut(ownerDocument) {
      if (!host.alive()) return () => undefined;
      const shortcut = options.shortcut ?? {};
      return host.resources.add(
        listen<KeyboardEvent>(ownerDocument, 'keydown', (event) => {
          const platform = ownerDocument.defaultView?.navigator.platform ?? '';
          const primary = /mac/iu.test(platform) ? event.metaKey : event.ctrlKey;
          if ((shortcut.ctrlOrMeta ?? true) !== primary) return;
          if (
            (shortcut.alt ?? false) !== event.altKey ||
            (shortcut.shift ?? false) !== event.shiftKey
          )
            return;
          if (event.key.toLocaleLowerCase() !== (shortcut.key ?? 'k').toLocaleLowerCase()) return;
          event.preventDefault();
          dialog.toggle({ reason: 'keyboard', event });
        }),
      );
    },
    open(changeDetails = { reason: 'programmatic' }) {
      dialog.open({
        reason: changeDetails.reason === 'shortcut' ? 'keyboard' : 'programmatic',
        ...(changeDetails.event ? { event: changeDetails.event } : {}),
      });
    },
    close(changeDetails = { reason: 'programmatic' }) {
      dialog.close({
        reason: 'programmatic',
        ...(changeDetails.event ? { event: changeDetails.event } : {}),
      });
    },
    setQuery,
    handleKeyDown(event) {
      if (!host.alive()) return;
      const enabled = commands.filter((command) => !command.disabled);
      const index = enabled.findIndex((command) => command.id === activeId);
      if (event.key === 'ArrowDown')
        activeId = enabled[(index + 1 + enabled.length) % enabled.length]?.id ?? null;
      else if (event.key === 'ArrowUp')
        activeId = enabled[(index - 1 + enabled.length) % enabled.length]?.id ?? null;
      else if (event.key === 'Home') activeId = enabled[0]?.id ?? null;
      else if (event.key === 'End') activeId = enabled.at(-1)?.id ?? null;
      else if (event.key === 'Enter' && activeId) select(activeId, { reason: 'keyboard', event });
      else if (event.key === 'Escape') dialog.close({ reason: 'escape-key', event });
      else return;
      event.preventDefault();
      sync();
    },
    select,
    destroy: host.destroy,
  };
}
