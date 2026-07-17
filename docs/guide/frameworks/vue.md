# Vue integration

## Scope

This page is a consumer-side Vue 3 Composition API recipe, not an official adapter or package. UI Headless Runtime remains a plain TypeScript dependency with no Vue runtime dependency and no bundled CSS.

Vue dependencies remain isolated from the runtime and root workspaces. These documentation snippets
are reviewed recipes rather than standalone compile targets; sections are complete at component
level unless explicitly marked as abbreviated. The separately compiled
[Vue npm consumer source](https://github.com/DanieleMasone/ui-headless-runtime/tree/main/examples/consumers/vue-vite)
uses an async Combobox and Toast lifecycle against the published package; validate product-specific
SSR and tests in the consuming application.

## Lifecycle model

Create the controller once in each component's `setup` scope, keep the controller itself outside deep reactive proxying, and mirror immutable snapshots into a `shallowRef`. Subscribe once, bind DOM in `onMounted` after template refs exist, then release bindings, unsubscribe, and destroy in `onBeforeUnmount`.

Do not place mutable controller instances in module scope in an SSR application. Module singletons can be shared across requests. Controller creation is DOM-free, but DOM binding and other browser work belong in client-only mounted hooks.

## Minimal Disclosure example

This complete component renders every Disclosure relationship from the snapshot. Because a native button already maps Enter and Space to click, it forwards only the native click event.

```vue
<script setup lang="ts">
import { onBeforeUnmount, shallowRef } from 'vue';
import { createDisclosure, type DisclosureSnapshot } from 'ui-headless-runtime';

const controller = createDisclosure({ id: 'vue-shipping-details' });
const snapshot = shallowRef<Readonly<DisclosureSnapshot>>(controller.getSnapshot());
const unsubscribe = controller.subscribe((next) => {
  snapshot.value = next;
});

function handleTriggerClick(event: MouseEvent): void {
  controller.handleTriggerClick(event);
}

onBeforeUnmount(() => {
  unsubscribe();
  controller.destroy();
});
</script>

<template>
  <section class="runtime-disclosure">
    <button
      :id="snapshot.trigger.id"
      class="runtime-disclosure__trigger"
      type="button"
      :aria-controls="snapshot.trigger.ariaControls"
      :aria-expanded="snapshot.trigger.ariaExpanded"
      :disabled="snapshot.trigger.disabled"
      @click="handleTriggerClick"
    >
      Shipping details
    </button>
    <div
      :id="snapshot.panel.id"
      class="runtime-disclosure__panel"
      :role="snapshot.panel.role"
      :aria-labelledby="snapshot.panel.ariaLabelledby"
      :hidden="snapshot.panel.hidden"
    >
      Orders normally leave the warehouse within two business days.
    </div>
  </section>
</template>
```

## Dialog example

This complete component keeps the dialog content rendered and hidden, binds it after mount, and releases the DOM binding before destroying the controller. Passing the trigger to `bind` enables focus restoration when the trigger remains connected.

```vue
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { createDialog, type DialogSnapshot } from 'ui-headless-runtime';

const triggerRef = ref<HTMLButtonElement | null>(null);
const contentRef = ref<HTMLDivElement | null>(null);
const closeRef = ref<HTMLButtonElement | null>(null);
const controller = createDialog({
  id: 'vue-delete-project',
  modal: true,
  initialFocus: () => closeRef.value,
});
const snapshot = shallowRef<Readonly<DialogSnapshot>>(controller.getSnapshot());
const unsubscribe = controller.subscribe((next) => {
  snapshot.value = next;
});
let releaseBinding: () => void = () => undefined;

function openDialog(event: MouseEvent): void {
  controller.open({ reason: 'trigger', event });
}

function closeDialog(event: MouseEvent): void {
  controller.close({ reason: 'trigger', event });
}

onMounted(() => {
  const trigger = triggerRef.value;
  const content = contentRef.value;
  if (!trigger || !content) {
    throw new Error('Dialog template refs are unavailable after mount.');
  }
  releaseBinding = controller.bind({ trigger, content });
});

onBeforeUnmount(() => {
  releaseBinding();
  unsubscribe();
  controller.destroy();
});
</script>

<template>
  <button
    ref="triggerRef"
    type="button"
    aria-haspopup="dialog"
    :aria-controls="snapshot.contentId"
    :aria-expanded="snapshot.open"
    @click="openDialog"
  >
    Delete project
  </button>
  <div
    :id="snapshot.contentId"
    ref="contentRef"
    class="runtime-dialog"
    :role="snapshot.role"
    :aria-modal="snapshot.ariaModal ?? undefined"
    aria-labelledby="vue-delete-project-title"
    :hidden="!snapshot.open"
    tabindex="-1"
  >
    <h2 id="vue-delete-project-title">Delete project?</h2>
    <p>This action cannot be undone.</p>
    <button ref="closeRef" type="button" @click="closeDialog">Cancel</button>
  </div>
</template>
```

The consumer-provided heading supplies the accessible name. Modal focus containment, Escape, outside-pointer handling, background inerting, scroll lock, and restore focus are active only while the controller is open and bound.

## Controlled state example

Abbreviated for documentation; render the same ARIA fields and retain the same cleanup shown in the complete Disclosure component. The local `setExpanded` function represents a synchronous application store operation.

```vue
<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from 'vue';
import { createDisclosure, type DisclosureSnapshot } from 'ui-headless-runtime';

const expanded = ref(false);
const externalListeners = new Set<() => void>();

function setExpanded(next: boolean): void {
  if (expanded.value === next) return;
  expanded.value = next;
  for (const listener of externalListeners) listener();
}

const controller = createDisclosure({
  id: 'vue-controlled-disclosure',
  getValue: () => expanded.value,
  onValueChange: setExpanded,
  subscribeValue(listener) {
    externalListeners.add(listener);
    return () => externalListeners.delete(listener);
  },
});
const snapshot = shallowRef<Readonly<DisclosureSnapshot>>(controller.getSnapshot());
const unsubscribe = controller.subscribe((next) => {
  snapshot.value = next;
});

onBeforeUnmount(() => {
  unsubscribe();
  controller.destroy();
});
</script>

<template>
  <button type="button" @click="setExpanded(!expanded)">
    External owner: {{ expanded ? 'collapse' : 'expand' }}
  </button>
  <output>Controlled snapshot: {{ snapshot.expanded }}</output>
</template>
```

For Pinia or another application store, use its synchronous getter, mutation, and subscription APIs. Avoid a watcher that writes back into the same source and creates a feedback loop.

## CSS

This CSS belongs to the Vue application. UI Headless Runtime does not import or inject it.

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

- Do not create one mutable controller in module scope for all component instances or SSR requests.
- Do not wrap a controller in `reactive`; keep the object plain and mirror only immutable snapshots into `shallowRef`.
- Do not bind before `onMounted` or before required template refs exist.
- Release bindings before unmount, then unsubscribe and destroy.
- Keep external controlled-state notifications one-way and synchronous; avoid watcher loops.
- Mounted and unmount hooks do not run during SSR. Keep browser-only work inside client lifecycle hooks and use deterministic IDs for hydration.
- Supply accessible names, descriptions, visible focus, contrast, and final assistive-technology validation in consumer markup.
