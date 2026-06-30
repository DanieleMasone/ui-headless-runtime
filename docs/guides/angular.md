# Angular integration

Create a controller in the component, update an Angular signal from its subscription, bind after the view initializes, and release everything through `DestroyRef`.

```ts
readonly disclosure = createDisclosure();
readonly snapshot = signal(this.disclosure.getSnapshot());

constructor(destroyRef: DestroyRef) {
  const unsubscribe = this.disclosure.subscribe((value) => this.snapshot.set(value));
  destroyRef.onDestroy(() => {
    unsubscribe();
    this.disclosure.destroy();
  });
}
```

Template buttons forward clicks or key events; no zone integration or Angular runtime dependency is needed.
