# Svelte integration

Wrap a controller subscription in a readable store and destroy both resources with the component.

```ts
const controller = createDisclosure();
const snapshot = readable(controller.getSnapshot(), (set) => {
  const unsubscribe = controller.subscribe(set);
  return unsubscribe;
});

onDestroy(() => controller.destroy());
```

Svelte owns markup and transitions. The runtime remains the only source of interaction state.
