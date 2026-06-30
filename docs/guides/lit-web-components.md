# Lit and Web Components

Create the controller as an element field, request updates from its subscription, bind shadow/light DOM after render, and destroy on disconnect.

```ts
private readonly controller = createPopover();
private unsubscribe = this.controller.subscribe(() => this.requestUpdate());

disconnectedCallback(): void {
  this.unsubscribe();
  this.controller.destroy();
  super.disconnectedCallback();
}
```

Composed-path outside interaction works across shadow boundaries. Pass real shadow-root elements to binding and branch options.
