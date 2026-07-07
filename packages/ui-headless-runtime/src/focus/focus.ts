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

/** Returns visible, enabled elements that participate in sequential focus navigation. @public */
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

/** Focuses a preferred target, first tabbable descendant, or focusable fallback container. @public */
export function focusInitial(container: HTMLElement, preferred?: HTMLElement | null): HTMLElement {
  const candidate =
    preferred?.isConnected && !isUnavailable(preferred)
      ? preferred
      : (getTabbableElements(container)[0] ?? container);
  if (candidate === container && !container.hasAttribute('tabindex')) container.tabIndex = -1;
  candidate.focus({ preventScroll: true });
  return candidate;
}

/** Contains Tab focus inside a scope until its returned cleanup is called. @public */
export function trapFocus(container: HTMLElement): Unsubscribe {
  return listen<KeyboardEvent>(
    container.ownerDocument,
    'keydown',
    (event) => {
      if (event.key !== 'Tab') return;
      const tabbables = getTabbableElements(container);
      if (tabbables.length === 0) {
        event.preventDefault();
        focusInitial(container);
        return;
      }
      const first = tabbables[0];
      const last = tabbables.at(-1);
      const active = container.ownerDocument.activeElement;
      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (active === last || !container.contains(active))) {
        event.preventDefault();
        first?.focus();
      }
    },
    true,
  );
}

/** Restores focus when the target is still connected and focusable. @public */
export function restoreFocus(target: HTMLElement | null | undefined): boolean {
  if (!target?.isConnected || isUnavailable(target)) return false;
  target.focus({ preventScroll: true });
  return target.ownerDocument.activeElement === target;
}

/** Moves DOM focus among registered elements using a shared item ID. @public */
export function focusById(
  elements: ReadonlyMap<string, HTMLElement>,
  id: string | undefined,
): boolean {
  const target = id ? elements.get(id) : undefined;
  if (!target?.isConnected) return false;
  target.focus({ preventScroll: true });
  return true;
}
