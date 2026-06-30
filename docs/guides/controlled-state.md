# Controlled state

```ts
let open = store.getState().open;
const popover = createPopover({
  getValue: () => open,
  onValueChange(next, details) {
    store.setState({ open: next, reason: details.reason });
  },
  subscribeValue(listener) {
    return store.subscribe((state) => {
      open = state.open;
      listener();
    });
  },
});
```

`getValue` is authoritative. `onValueChange` is a request, not an internal mutation. Supply `subscribeValue` when the external store can change independently. Duplicate values are suppressed and re-entrant changes are serialized.
