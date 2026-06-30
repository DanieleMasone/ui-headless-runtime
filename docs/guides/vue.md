# Vue integration

Store the controller in module/component scope, copy snapshots into a shallow ref, and destroy it in `onUnmounted`.

```ts
const controller = createListbox();
const snapshot = shallowRef(controller.getSnapshot());
const unsubscribe = controller.subscribe((value) => {
  snapshot.value = value;
});

onUnmounted(() => {
  unsubscribe();
  controller.destroy();
});
```

Use Vue templates to render option roles and `aria-selected`; register/unregister options when `v-for` items mount and unmount.
