# React integration

## Scope

This page is a consumer-side React recipe, not an official adapter or package. It uses TypeScript and APIs available in React 18 and React 19. UI Headless Runtime remains a framework-agnostic dependency with no React runtime dependency and no CSS import.

React dependencies remain isolated from the runtime and root workspaces. These documentation
snippets are reviewed recipes rather than standalone compile targets; sections are complete at
component level unless explicitly marked as abbreviated. The separately compiled
[React npm consumer source](https://github.com/DanieleMasone/ui-headless-runtime/tree/main/examples/consumers/react-vite)
uses Dialog and controlled/dynamic Tabs against the published package; validate product-specific
SSR and tests in the consuming application.

## Lifecycle model

For a component-local controller, create the active instance inside `useEffect`, keep it in a ref for event handlers, subscribe during the same setup, and unsubscribe and destroy that exact instance in cleanup. This matters in development Strict Mode: React intentionally runs an extra setup, cleanup, and setup sequence. The second setup must create a fresh controller instead of reusing one destroyed by the first cleanup.

Use `useSyncExternalStore` when a controller is owned by a longer-lived parent, context, or application store and the current component only subscribes to it:

```tsx
import { useCallback, useSyncExternalStore } from 'react';
import type { RuntimeController } from 'ui-headless-runtime';

export function useControllerSnapshot<TSnapshot>(
  controller: RuntimeController<TSnapshot>,
): Readonly<TSnapshot> {
  const subscribe = useCallback((notify: () => void) => controller.subscribe(notify), [controller]);
  const getSnapshot = useCallback(() => controller.getSnapshot(), [controller]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
```

The owner of the controller, not `useControllerSnapshot`, must eventually call `destroy()`. Runtime snapshots are immutable and retain their identity until the controller publishes a real change, which matches the external-store contract.

## Minimal Disclosure example

This complete client-side example creates one live controller per committed effect lifecycle. It renders a deterministic fallback during SSR and initial hydration, then replaces it after the client effect creates the interactive controller.

```tsx
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import {
  createDisclosure,
  type DisclosureController,
  type DisclosureSnapshot,
} from 'ui-headless-runtime';

export function ShippingDisclosure() {
  const controllerRef = useRef<DisclosureController | null>(null);
  const [snapshot, setSnapshot] = useState<Readonly<DisclosureSnapshot> | null>(null);

  useEffect(() => {
    const controller = createDisclosure({ id: 'react-shipping-details' });
    controllerRef.current = controller;
    setSnapshot(controller.getSnapshot());
    const unsubscribe = controller.subscribe(setSnapshot);

    return () => {
      unsubscribe();
      controller.destroy();
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, []);

  if (!snapshot) {
    return <p>Shipping details become interactive after client mount.</p>;
  }

  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    controllerRef.current?.handleTriggerClick(event.nativeEvent);
  };

  return (
    <section className="runtime-disclosure">
      <button
        id={snapshot.trigger.id}
        className="runtime-disclosure__trigger"
        type="button"
        aria-controls={snapshot.trigger.ariaControls}
        aria-expanded={snapshot.trigger.ariaExpanded}
        disabled={snapshot.trigger.disabled}
        onClick={handleClick}
      >
        Shipping details
      </button>
      <div
        id={snapshot.panel.id}
        className="runtime-disclosure__panel"
        role={snapshot.panel.role}
        aria-labelledby={snapshot.panel.ariaLabelledby}
        hidden={snapshot.panel.hidden}
      >
        Orders normally leave the warehouse within two business days.
      </div>
    </section>
  );
}
```

A native `<button>` already converts Enter and Space into click activation. Forward its React click's `nativeEvent`; do not also call `handleTriggerKeyDown`, which is intended for non-native triggers and would introduce redundant, browser-sensitive activation handling.

## Dialog example

This complete example keeps the content mounted and hidden so its ref is stable. Binding begins only after React has committed the trigger and content nodes. The binding owns focus containment, outside interaction, Escape handling, scroll lock, and focus restoration while the modal is open.

```tsx
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { createDialog, type DialogController, type DialogSnapshot } from 'ui-headless-runtime';

export function DeleteProjectDialog() {
  const controllerRef = useRef<DialogController | null>(null);
  const releaseBindingRef = useRef<() => void>(() => undefined);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [controller, setController] = useState<DialogController | null>(null);
  const [snapshot, setSnapshot] = useState<Readonly<DialogSnapshot> | null>(null);

  useEffect(() => {
    const controller = createDialog({
      id: 'react-delete-project',
      modal: true,
      initialFocus: () => closeRef.current,
    });
    controllerRef.current = controller;
    setController(controller);
    setSnapshot(controller.getSnapshot());
    const unsubscribe = controller.subscribe(setSnapshot);

    return () => {
      releaseBindingRef.current();
      releaseBindingRef.current = () => undefined;
      unsubscribe();
      controller.destroy();
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const trigger = triggerRef.current;
    const content = contentRef.current;
    if (!controller || !trigger || !content) return;

    const release = controller.bind({ trigger, content });
    releaseBindingRef.current = release;
    return () => {
      release();
      if (releaseBindingRef.current === release) {
        releaseBindingRef.current = () => undefined;
      }
    };
  }, [controller]);

  if (!snapshot) {
    return <p>Dialog controls become interactive after client mount.</p>;
  }

  const open = (event: ReactMouseEvent<HTMLButtonElement>) => {
    controllerRef.current?.open({ reason: 'trigger', event: event.nativeEvent });
  };
  const close = (event: ReactMouseEvent<HTMLButtonElement>) => {
    controllerRef.current?.close({ reason: 'trigger', event: event.nativeEvent });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-controls={snapshot.contentId}
        aria-expanded={snapshot.open}
        onClick={open}
      >
        Delete project
      </button>
      <div
        ref={contentRef}
        id={snapshot.contentId}
        className="runtime-dialog"
        role={snapshot.role}
        aria-modal={snapshot.ariaModal ?? undefined}
        aria-labelledby="react-delete-project-title"
        hidden={!snapshot.open}
        tabIndex={-1}
      >
        <h2 id="react-delete-project-title">Delete project?</h2>
        <p>This action cannot be undone.</p>
        <button ref={closeRef} type="button" onClick={close}>
          Cancel
        </button>
      </div>
    </>
  );
}
```

The trigger is supplied to `bind`, so closing restores focus when that trigger remains connected. The consumer-provided heading supplies the accessible name; the runtime cannot infer it from product copy.

## Controlled state example

Abbreviated for documentation; render the same ARIA fields shown in the complete Disclosure example. This example demonstrates the real controlled-state contract rather than keeping an unrelated React state copy.

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createDisclosure,
  type DisclosureController,
  type DisclosureSnapshot,
} from 'ui-headless-runtime';

export function ControlledDisclosure() {
  const controllerRef = useRef<DisclosureController | null>(null);
  const externalListeners = useRef(new Set<() => void>());
  const expandedRef = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const [snapshot, setSnapshot] = useState<Readonly<DisclosureSnapshot> | null>(null);

  const setControlledExpanded = useCallback((next: boolean) => {
    if (expandedRef.current === next) return;
    expandedRef.current = next;
    setExpanded(next);
    for (const listener of externalListeners.current) listener();
  }, []);

  useEffect(() => {
    const controller = createDisclosure({
      id: 'react-controlled-disclosure',
      getValue: () => expandedRef.current,
      onValueChange: setControlledExpanded,
      subscribeValue(listener) {
        externalListeners.current.add(listener);
        return () => externalListeners.current.delete(listener);
      },
    });
    controllerRef.current = controller;
    setSnapshot(controller.getSnapshot());
    const unsubscribe = controller.subscribe(setSnapshot);

    return () => {
      unsubscribe();
      controller.destroy();
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, [setControlledExpanded]);

  return (
    <div>
      <button type="button" onClick={() => setControlledExpanded(!expanded)}>
        External owner: {expanded ? 'collapse' : 'expand'}
      </button>
      <button
        type="button"
        disabled={!snapshot}
        onClick={(event) => controllerRef.current?.handleTriggerClick(event.nativeEvent)}
      >
        Runtime request
      </button>
      <output>Controlled snapshot: {String(snapshot?.expanded ?? false)}</output>
    </div>
  );
}
```

In an application store, replace the local ref and listener set with that store's synchronous `get`, `set`, and `subscribe` operations.

## CSS

This CSS belongs to the React application. UI Headless Runtime does not import or inject it.

```css
.runtime-disclosure__trigger:focus-visible,
.runtime-dialog button:focus-visible {
  outline: 3px solid CanvasText;
  outline-offset: 3px;
}

.runtime-disclosure__panel,
.runtime-dialog {
  color: CanvasText;
  background: Canvas;
}

@media (prefers-reduced-motion: reduce) {
  .runtime-dialog {
    scroll-behavior: auto;
  }
}
```

See [CSS ownership](../framework-integration#css-ownership) for the shared styling contract.

## Pitfalls

- Do not create controllers during render with `createDisclosure()` or `useMemo()` and then destroy that same object in a cleanup-only effect. Strict Mode replays effects and would leave the memoized object destroyed.
- Do not omit release, unsubscribe, or destroy steps. Each owns a different layer of resources.
- Do not bind from render or before refs are committed.
- Do not close over a stale controlled value; provide a synchronous external getter and subscription.
- Do not forward React's synthetic event where the runtime expects a platform event; use `event.nativeEvent`.
- Keep server and initial client output identical. DOM binding and focus behavior start only after client commit.
- Supply visible labels, dialog names, descriptions, error messages, and tested focus styling in consumer markup.
