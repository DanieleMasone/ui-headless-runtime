import { getScrollableAncestors, listen } from '../dom/dom';
import type { Unsubscribe } from '../core/types';

/** Logical side and alignment for an anchored floating element. @public */
export type Placement =
  | 'top-start'
  | 'top'
  | 'top-end'
  | 'right-start'
  | 'right'
  | 'right-end'
  | 'bottom-start'
  | 'bottom'
  | 'bottom-end'
  | 'left-start'
  | 'left'
  | 'left-end';

/** Minimal rectangle implemented by DOM elements and virtual pointer anchors. @public */
export interface AnchorRect {
  /** Horizontal viewport coordinate. */
  readonly x: number;
  /** Vertical viewport coordinate. */
  readonly y: number;
  /** Anchor width. */
  readonly width: number;
  /** Anchor height. */
  readonly height: number;
}

/** Consumer-provided virtual anchor, typically created from pointer coordinates. @public */
export interface VirtualAnchor {
  /** Returns a fresh viewport-relative rectangle. */
  getBoundingClientRect(): AnchorRect;
  /** Optional real element used to resolve document, direction, and scroll ancestors. */
  readonly contextElement?: Element;
}

/** Collision and geometry settings shared by anchored components. @public */
export interface PositionOptions {
  /** Preferred side and alignment. @defaultValue `bottom-start` */
  readonly placement?: Placement;
  /** Gap between anchor and floating element in CSS pixels. @defaultValue `4` */
  readonly offset?: number;
  /** Viewport collision padding in CSS pixels. @defaultValue `8` */
  readonly collisionPadding?: number;
  /** Allows opposite-side fallback when the preferred side overflows. @defaultValue `true` */
  readonly flip?: boolean;
  /** Clamps cross-axis coordinates inside the viewport. @defaultValue `true` */
  readonly shift?: boolean;
  /** Resolves logical start/end alignment for RTL content. @defaultValue `false` */
  readonly rtl?: boolean;
  /** Explicit viewport width for deterministic or virtualized calculations. */
  readonly viewportWidth?: number;
  /** Explicit viewport height for deterministic or virtualized calculations. */
  readonly viewportHeight?: number;
}

/** Coordinates and collision metadata returned without applying visual styles. @public */
export interface PositionResult {
  /** Horizontal viewport coordinate. */
  readonly x: number;
  /** Vertical viewport coordinate. */
  readonly y: number;
  /** Final placement after collision handling. */
  readonly placement: Placement;
  /** Whether collision handling changed the preferred side. */
  readonly flipped: boolean;
  /** Whether collision handling shifted either coordinate. */
  readonly shifted: boolean;
}

const opposite = (placement: Placement): Placement => {
  const [side, alignment] = placement.split('-') as [string, string | undefined];
  const sides: Record<string, string> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
  };
  return `${sides[side]}${alignment ? `-${alignment}` : ''}` as Placement;
};

/** Calculates anchored coordinates with flip, shift, and RTL support. @public */
export function calculatePosition(
  anchor: AnchorRect,
  floating: Readonly<{ width: number; height: number }>,
  options: PositionOptions = {},
): PositionResult {
  const preferred = options.placement ?? 'bottom-start';
  const gap = options.offset ?? 4;
  const padding = options.collisionPadding ?? 8;
  const viewportWidth =
    options.viewportWidth ?? (typeof window === 'undefined' ? 1024 : window.innerWidth);
  const viewportHeight =
    options.viewportHeight ?? (typeof window === 'undefined' ? 768 : window.innerHeight);
  const coordinates = (placement: Placement): { x: number; y: number } => {
    const [side, rawAlignment] = placement.split('-') as [string, 'start' | 'end' | undefined];
    const alignment =
      options.rtl && rawAlignment ? (rawAlignment === 'start' ? 'end' : 'start') : rawAlignment;
    let x = anchor.x + (anchor.width - floating.width) / 2;
    let y = anchor.y + (anchor.height - floating.height) / 2;
    if (side === 'top') y = anchor.y - floating.height - gap;
    if (side === 'bottom') y = anchor.y + anchor.height + gap;
    if (side === 'left') x = anchor.x - floating.width - gap;
    if (side === 'right') x = anchor.x + anchor.width + gap;
    if (side === 'top' || side === 'bottom') {
      if (alignment === 'start') x = anchor.x;
      if (alignment === 'end') x = anchor.x + anchor.width - floating.width;
    } else {
      if (alignment === 'start') y = anchor.y;
      if (alignment === 'end') y = anchor.y + anchor.height - floating.height;
    }
    return { x, y };
  };
  const overflows = ({ x, y }: { x: number; y: number }): boolean =>
    x < padding ||
    y < padding ||
    x + floating.width > viewportWidth - padding ||
    y + floating.height > viewportHeight - padding;
  let placement = preferred;
  let point = coordinates(placement);
  let flipped = false;
  if ((options.flip ?? true) && overflows(point)) {
    const candidate = opposite(placement);
    const candidatePoint = coordinates(candidate);
    if (!overflows(candidatePoint)) {
      placement = candidate;
      point = candidatePoint;
      flipped = true;
    }
  }
  const unclamped = point;
  if (options.shift ?? true) {
    point = {
      x: Math.min(Math.max(point.x, padding), viewportWidth - floating.width - padding),
      y: Math.min(Math.max(point.y, padding), viewportHeight - floating.height - padding),
    };
  }
  return Object.freeze({
    ...point,
    placement,
    flipped,
    shifted: point.x !== unclamped.x || point.y !== unclamped.y,
  });
}

/** Recalculates position on relevant scroll, resize, and element resize changes. @public */
export function autoUpdatePosition(
  anchor: Element | VirtualAnchor,
  floating: Element,
  update: () => void,
): Unsubscribe {
  const context = 'ownerDocument' in anchor ? anchor : anchor.contextElement;
  const ownerWindow = floating.ownerDocument.defaultView;
  const cleanups: Unsubscribe[] = [];
  if (ownerWindow) cleanups.push(listen(ownerWindow, 'resize', update));
  for (const ancestor of context ? getScrollableAncestors(context) : []) {
    cleanups.push(listen(ancestor, 'scroll', update, { passive: true }));
  }
  const ResizeObserverConstructor = ownerWindow?.ResizeObserver;
  const observer = ResizeObserverConstructor ? new ResizeObserverConstructor(update) : undefined;
  if (observer) {
    if (context) observer.observe(context);
    observer.observe(floating);
    cleanups.push(() => observer.disconnect());
  }
  update();
  return () =>
    cleanups
      .splice(0)
      .reverse()
      .forEach((cleanup) => cleanup());
}

/** Creates a point-sized virtual anchor for context menus and pointer popovers. @public */
export function createVirtualAnchor(x: number, y: number, contextElement?: Element): VirtualAnchor {
  return {
    ...(contextElement ? { contextElement } : {}),
    getBoundingClientRect: () => ({ x, y, width: 0, height: 0 }),
  };
}
