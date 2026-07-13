import { isHTMLInputElement, listen } from '../dom/dom';
import type { Unsubscribe } from '../core/types';

const selector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

const isUnavailable = (element: HTMLElement): boolean => {
  if (
    element.hidden ||
    element.closest('[hidden], [inert], [aria-hidden="true"]') ||
    ('disabled' in element && element.disabled === true)
  )
    return true;
  const closedDetails = element.closest('details:not([open])');
  const summary = closedDetails?.querySelector<HTMLElement>(':scope > summary');
  if (closedDetails && !summary?.contains(element)) return true;
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  return style?.display === 'none' || style?.visibility === 'hidden';
};

/** Returns visible, enabled elements that participate in sequential focus navigation. @internal */
export function getTabbableElements(container: Element): readonly HTMLElement[] {
  const candidates = [...container.querySelectorAll<HTMLElement>(selector)].filter(
    (element) => !isUnavailable(element) && element.getClientRects().length > 0,
  );
  return candidates.filter((element) => {
    if (!isHTMLInputElement(element)) return true;
    if (element.type !== 'radio' || !element.name) return true;
    const group = candidates.filter(
      (candidate): candidate is HTMLInputElement =>
        isHTMLInputElement(candidate) &&
        candidate.type === 'radio' &&
        candidate.name === element.name &&
        candidate.form === element.form,
    );
    const checked = group.find((radio) => radio.checked);
    return checked ? checked === element : group[0] === element;
  });
}

/** Focuses a preferred target, first tabbable descendant, or focusable fallback container. @internal */
export function focusInitial(
  container: HTMLElement,
  preferred?: HTMLElement | null,
  ownFallbackCleanup?: (cleanup: Unsubscribe) => void,
): HTMLElement {
  const candidate =
    preferred?.isConnected &&
    (preferred === container || container.contains(preferred)) &&
    !isUnavailable(preferred)
      ? preferred
      : (getTabbableElements(container)[0] ?? container);
  if (candidate === container && !container.hasAttribute('tabindex')) {
    container.tabIndex = -1;
    ownFallbackCleanup?.(() => {
      if (container.getAttribute('tabindex') === '-1') container.removeAttribute('tabindex');
    });
  }
  candidate.focus({ preventScroll: true });
  return candidate;
}

/** Contains Tab focus inside a scope until its returned cleanup is called. @internal */
export function trapFocus(container: HTMLElement, branches: readonly Element[] = []): Unsubscribe {
  const scopes = [...new Set<Element>([container, ...branches])].filter(
    (scope) => scope.ownerDocument === container.ownerDocument,
  );
  const fallbackCleanups = new Set<Unsubscribe>();
  const releaseListener = listen<KeyboardEvent>(
    container.ownerDocument,
    'keydown',
    (event) => {
      if (event.key !== 'Tab') return;
      const tabbables = [...new Set(scopes.flatMap((scope) => getTabbableElements(scope)))];
      if (tabbables.length === 0) {
        event.preventDefault();
        focusInitial(container, undefined, (cleanup) => fallbackCleanups.add(cleanup));
        return;
      }
      const first = tabbables[0];
      const last = tabbables.at(-1);
      const active = container.ownerDocument.activeElement;
      const containsActive = scopes.some(
        (scope) => active !== null && (scope === active || scope.contains(active)),
      );
      if (event.shiftKey && (active === first || !containsActive)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (active === last || !containsActive)) {
        event.preventDefault();
        first?.focus();
      }
    },
    true,
  );
  return () => {
    releaseListener();
    for (const cleanup of fallbackCleanups) cleanup();
    fallbackCleanups.clear();
  };
}

/** Restores focus when the target is still connected and focusable. @internal */
export function restoreFocus(target: HTMLElement | null | undefined): boolean {
  if (!target?.isConnected || isUnavailable(target)) return false;
  target.focus({ preventScroll: true });
  return target.ownerDocument.activeElement === target;
}

/** Moves DOM focus among registered elements using a shared item ID. @internal */
export function focusById(
  elements: ReadonlyMap<string, HTMLElement>,
  id: string | undefined,
): boolean {
  const target = id ? elements.get(id) : undefined;
  if (!target?.isConnected) return false;
  target.focus({ preventScroll: true });
  return true;
}
