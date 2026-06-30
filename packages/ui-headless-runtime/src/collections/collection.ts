import type { Unsubscribe } from '../core/types';

/** Item metadata shared by menus, selectors, tabs, trees, and command palettes. @public */
export interface CollectionItem {
  /** Stable consumer-provided identifier. */
  readonly id: string;
  /** Text used for typeahead and search. */
  readonly text: string;
  /** Whether keyboard navigation and selection skip the item. */
  readonly disabled?: boolean;
}

/** Dynamic ordered item registry. @public */
export interface CollectionRegistry<TItem extends CollectionItem> {
  /** Registers or replaces an item and returns cleanup scoped to that registration. */
  register(item: TItem): Unsubscribe;
  /** Returns an immutable insertion-ordered item list. */
  items(): readonly TItem[];
  /** Finds an item by stable ID. */
  get(id: string): TItem | undefined;
  /** Returns the next enabled item ID, optionally wrapping at either edge. */
  move(fromId: string | undefined, delta: 1 | -1, loop?: boolean): string | undefined;
  /** Returns the first or last enabled item ID. */
  edge(edge: 'first' | 'last'): string | undefined;
  /** Clears every registration. */
  clear(): void;
}

/** Creates the shared dynamic collection primitive. @public */
export function createCollection<TItem extends CollectionItem>(): CollectionRegistry<TItem> {
  const entries = new Map<string, { item: TItem; token: symbol }>();
  return {
    register(item) {
      const token = Symbol(item.id);
      entries.set(item.id, { item: Object.freeze({ ...item }), token });
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        if (entries.get(item.id)?.token === token) entries.delete(item.id);
      };
    },
    items: () => Object.freeze([...entries.values()].map(({ item }) => item)),
    get: (id) => entries.get(id)?.item,
    move(fromId, delta, loop = true) {
      const enabled = [...entries.values()]
        .map(({ item }) => item)
        .filter((item) => !item.disabled);
      if (enabled.length === 0) return undefined;
      const currentIndex = fromId ? enabled.findIndex((item) => item.id === fromId) : -1;
      let nextIndex = currentIndex + delta;
      if (currentIndex < 0) nextIndex = delta === 1 ? 0 : enabled.length - 1;
      if (loop) nextIndex = (nextIndex + enabled.length) % enabled.length;
      const next = enabled[nextIndex];
      return next?.id;
    },
    edge(edge) {
      const enabled = [...entries.values()]
        .map(({ item }) => item)
        .filter((item) => !item.disabled);
      return edge === 'first' ? enabled[0]?.id : enabled.at(-1)?.id;
    },
    clear: () => entries.clear(),
  };
}

/** Normalizes human-readable item text for locale-aware typeahead matching. @public */
export function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .trim()
    .toLocaleLowerCase();
}

/** Returns the first enabled item beginning with a normalized search buffer. @public */
export function findTypeaheadMatch<TItem extends CollectionItem>(
  items: readonly TItem[],
  query: string,
  afterId?: string,
): string | undefined {
  const normalized = normalizeText(query);
  if (!normalized) return undefined;
  const enabled = items.filter((item) => !item.disabled);
  const start = afterId ? enabled.findIndex((item) => item.id === afterId) + 1 : 0;
  const ordered = [...enabled.slice(start), ...enabled.slice(0, start)];
  return ordered.find((item) => normalizeText(item.text).startsWith(normalized))?.id;
}

/** Scores a fuzzy match; `Number.NEGATIVE_INFINITY` means no ordered match. @public */
export function fuzzyScore(value: string, query: string): number {
  const haystack = normalizeText(value);
  const needle = normalizeText(query);
  if (!needle) return 0;
  let cursor = 0;
  let score = 0;
  let previous = -2;
  for (const character of needle) {
    const found = haystack.indexOf(character, cursor);
    if (found < 0) return Number.NEGATIVE_INFINITY;
    score += found === previous + 1 ? 4 : Math.max(1, 3 - found);
    previous = found;
    cursor = found + 1;
  }
  return score - haystack.length * 0.01;
}
