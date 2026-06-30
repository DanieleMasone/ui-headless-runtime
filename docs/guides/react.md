# React integration

Create the controller once, bridge snapshots through `useSyncExternalStore`, bind DOM in an effect, and destroy on unmount. The package does not ship a React wrapper.

```tsx
const controller = useMemo(() => createDialog(), []);
const snapshot = useSyncExternalStore(
  controller.subscribe,
  controller.getSnapshot,
  controller.getSnapshot,
);
const triggerRef = useRef<HTMLButtonElement>(null);
const contentRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const trigger = triggerRef.current;
  const content = contentRef.current;
  if (!trigger || !content) return;
  return controller.bind({ trigger, content });
}, [controller]);

useEffect(() => () => controller.destroy(), [controller]);
```

Render `hidden`, role, modal, IDs, and event forwarding from the snapshot. Strict Mode remains safe because destroy and cleanup functions are idempotent.
