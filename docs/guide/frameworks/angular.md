# Angular integration

## Scope

This page is a consumer-side Angular recipe, not an official adapter or package. It uses standalone components, TypeScript, Signals, `DestroyRef`, `AfterViewInit`, and `ViewChild`. UI Headless Runtime remains a framework-agnostic dependency with no Angular runtime dependency and no bundled CSS.

Angular dependencies remain isolated from the runtime and root workspaces. These documentation
snippets are reviewed recipes rather than standalone compile targets; sections are complete at
component level unless explicitly marked as abbreviated. The separately compiled
[Angular npm consumer source](https://github.com/DanieleMasone/ui-headless-runtime/tree/main/examples/consumers/angular-standalone)
uses standalone Accordion and dynamic Tree View integration against the published package; validate
product-specific SSR/hydration and tests in the consuming application.

## Lifecycle model

Create the controller as a component-owned field, initialize a Signal from its immutable snapshot, and subscribe once in the constructor. Register unsubscribe and destruction with the component's `DestroyRef`. For controllers that bind DOM, resolve `ViewChild` elements and call `bind(...)` in `ngAfterViewInit`, then release that binding before unsubscribe and destroy.

Signals are useful for exposing controller snapshots to templates; an `effect` is not needed merely to copy one signal into another. Use a controlled-state bridge only when Angular state is intentionally authoritative.

## Minimal Disclosure example

This complete standalone component renders every Disclosure relationship from the snapshot. The native button supplies Enter and Space behavior through click activation.

```ts
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { createDisclosure, type DisclosureSnapshot } from 'ui-headless-runtime';

@Component({
  selector: 'app-shipping-disclosure',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="runtime-disclosure">
      <button
        class="runtime-disclosure__trigger"
        type="button"
        [id]="snapshot().trigger.id"
        [attr.aria-controls]="snapshot().trigger.ariaControls"
        [attr.aria-expanded]="snapshot().trigger.ariaExpanded"
        [disabled]="snapshot().trigger.disabled"
        (click)="handleTriggerClick($event)"
      >
        Shipping details
      </button>
      <div
        class="runtime-disclosure__panel"
        [id]="snapshot().panel.id"
        [attr.role]="snapshot().panel.role"
        [attr.aria-labelledby]="snapshot().panel.ariaLabelledby"
        [hidden]="snapshot().panel.hidden"
      >
        Orders normally leave the warehouse within two business days.
      </div>
    </section>
  `,
})
export class ShippingDisclosureComponent {
  private readonly controller = createDisclosure({ id: 'angular-shipping-details' });
  readonly snapshot = signal<Readonly<DisclosureSnapshot>>(this.controller.getSnapshot());

  constructor() {
    const unsubscribe = this.controller.subscribe((next) => this.snapshot.set(next));
    inject(DestroyRef).onDestroy(() => {
      unsubscribe();
      this.controller.destroy();
    });
  }

  handleTriggerClick(event: MouseEvent): void {
    this.controller.handleTriggerClick(event);
  }
}
```

## Dialog example

This complete standalone component keeps its dialog content rendered and hidden. `AfterViewInit` guarantees that the trigger and content queries are available before binding, while `isPlatformBrowser` keeps binding out of server rendering. Cleanup releases the binding first, allowing focus and overlay resources to settle before the controller is destroyed.

```ts
import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { createDialog, type DialogSnapshot } from 'ui-headless-runtime';

@Component({
  selector: 'app-delete-project-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      #trigger
      type="button"
      aria-haspopup="dialog"
      [attr.aria-controls]="snapshot().contentId"
      [attr.aria-expanded]="snapshot().open"
      (click)="openDialog($event)"
    >
      Delete project
    </button>
    <div
      #content
      class="runtime-dialog"
      [id]="snapshot().contentId"
      [attr.role]="snapshot().role"
      [attr.aria-modal]="snapshot().ariaModal"
      aria-labelledby="angular-delete-project-title"
      [hidden]="!snapshot().open"
      tabindex="-1"
    >
      <h2 id="angular-delete-project-title">Delete project?</h2>
      <p>This action cannot be undone.</p>
      <button #closeButton type="button" (click)="closeDialog($event)">Cancel</button>
    </div>
  `,
})
export class DeleteProjectDialogComponent implements AfterViewInit {
  @ViewChild('trigger', { static: true })
  private trigger!: ElementRef<HTMLButtonElement>;

  @ViewChild('content', { static: true })
  private content!: ElementRef<HTMLDivElement>;

  @ViewChild('closeButton', { static: true })
  private closeButton!: ElementRef<HTMLButtonElement>;

  private readonly controller = createDialog({
    id: 'angular-delete-project',
    modal: true,
    initialFocus: () => this.closeButton.nativeElement,
  });
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private releaseBinding: () => void = () => undefined;
  readonly snapshot = signal<Readonly<DialogSnapshot>>(this.controller.getSnapshot());

  constructor() {
    const unsubscribe = this.controller.subscribe((next) => this.snapshot.set(next));
    inject(DestroyRef).onDestroy(() => {
      this.releaseBinding();
      unsubscribe();
      this.controller.destroy();
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.releaseBinding = this.controller.bind({
      trigger: this.trigger.nativeElement,
      content: this.content.nativeElement,
    });
  }

  openDialog(event: MouseEvent): void {
    this.controller.open({ reason: 'trigger', event });
  }

  closeDialog(event: MouseEvent): void {
    this.controller.close({ reason: 'trigger', event });
  }
}
```

Passing the trigger enables restore focus while it remains connected. The consumer-provided heading supplies the accessible name. Modal focus containment, Escape, outside-pointer handling, background inerting, and scroll lock come from the bound controller.

## Controlled state example

Abbreviated for documentation; render the same ARIA fields shown in the complete Disclosure component. The writable Signal is authoritative, and every accepted change synchronously notifies the controller through `subscribeValue`.

```ts
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { createDisclosure, type DisclosureSnapshot } from 'ui-headless-runtime';

@Component({
  selector: 'app-controlled-disclosure',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" (click)="setExpanded(!expanded())">
      External owner: {{ expanded() ? 'collapse' : 'expand' }}
    </button>
    <output>Controlled snapshot: {{ snapshot().expanded }}</output>
  `,
})
export class ControlledDisclosureComponent {
  readonly expanded = signal(false);
  private readonly externalListeners = new Set<() => void>();
  private readonly controller = createDisclosure({
    id: 'angular-controlled-disclosure',
    getValue: () => this.expanded(),
    onValueChange: (next) => this.setExpanded(next),
    subscribeValue: (listener) => {
      this.externalListeners.add(listener);
      return () => this.externalListeners.delete(listener);
    },
  });
  readonly snapshot = signal<Readonly<DisclosureSnapshot>>(this.controller.getSnapshot());

  constructor() {
    const unsubscribe = this.controller.subscribe((next) => this.snapshot.set(next));
    inject(DestroyRef).onDestroy(() => {
      unsubscribe();
      this.controller.destroy();
    });
  }

  setExpanded(next: boolean): void {
    if (this.expanded() === next) return;
    this.expanded.set(next);
    for (const listener of this.externalListeners) listener();
  }
}
```

An application store or service can provide the same synchronous getter, mutation, and subscription contract. Avoid an `effect` that writes back to the Signal it reads; that introduces a feedback loop instead of clear ownership.

## CSS

This CSS belongs to the Angular application, whether supplied through `styleUrl`, component styles, or the application's global cascade. UI Headless Runtime does not import or inject it.

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

- Do not create a controller from a template expression; own one instance in the component class.
- Do not call `bind(...)` before `AfterViewInit` or before required queries resolve.
- Release bindings, unsubscribe, and destroy through the same component `DestroyRef`.
- Do not introduce an `effect` solely to copy controller state; subscriptions already define that bridge.
- Signals read by the template update OnPush views. Verify custom zoneless scheduling and callbacks invoked outside the application's normal event flow in the consumer application.
- Keep browser-only binding out of server rendering with an explicit platform guard, and use deterministic IDs when hydrating.
- Supply dialog names, descriptions, visible focus, contrast, error handling, and final assistive-technology validation in consumer markup.
