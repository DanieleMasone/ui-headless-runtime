# Vue 3 + Vite consumer

This standalone application installs `ui-headless-runtime` from npm. It is intentionally direct
integration code, not an official Vue adapter or a second component library.

The example demonstrates two public controllers:

- **Combobox** uses a Vue-owned selected value, including an explicit rejection mode, while the
  runtime owns editable input state. Suggestions load asynchronously with different response
  delays; `loadOptions` and its `AbortSignal` exercise the runtime's cancellation and stale-response
  protection. Rendering comes from immutable snapshots, including the active descendant, loading,
  empty, selected, and disabled states. Native input, composition, and keyboard events are forwarded
  explicitly, and the input/listbox elements are connected through `bind()`.
- **Toast** demonstrates timed notifications, explicit pause/resume, hover and focus pause binding,
  dismiss, priority queue metadata, and both successful and rejected promise lifecycles. The
  original promise result remains visible to consumer code.

Vue's `ref`, `shallowRef`, `computed`, `watch`, `onMounted`, and `onBeforeUnmount` APIs keep the
integration lifecycle visible. On unmount, the app releases subscriptions and DOM bindings,
destroys both controllers, and cancels its own pending example operations.

## Run it

```bash
npm ci
npm run typecheck
npm run build
npm run dev
```

All markup and CSS belong to this consumer. Imports use only the public `ui-headless-runtime`
package entry point.
