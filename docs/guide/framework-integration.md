# Framework integration

UI Headless Runtime exposes renderer-neutral TypeScript controllers. The package does not ship official React, Vue, Angular, Svelte, or Web Component adapters. It declares no framework dependencies, and these recipes add no direct framework dependency to the workspace.

The pages in this section are consumer-side recipes. They demonstrate how an application can connect the public controller API to its own framework lifecycle without creating a second source of interaction state.

## Controller-based integration

Every public controller provides an immutable snapshot, a subscription, typed commands, and idempotent destruction. Components that own DOM also return release functions from `bind(...)`. A framework integration follows the same sequence:

1. Create one controller for one mounted consumer component.
2. Read the initial snapshot and subscribe to future snapshots.
3. Mirror each snapshot into framework state without mutating it.
4. Render roles, IDs, ARIA relationships, visibility, and disabled state from that snapshot.
5. Bind real DOM elements only after refs or view queries are available.
6. Release DOM bindings and unsubscribe when the framework lifecycle ends.
7. Call `destroy()` last to release every remaining controller-owned resource.

Controller commands after `destroy()` are no-ops, and release functions are idempotent. Those guarantees make cleanup defensive, but they do not replace correct framework lifecycle ownership.

## Framework recipes

- [React integration](./frameworks/react) uses React 18/19-compatible hooks, an effect-owned controller, external-store subscriptions, and DOM refs.
- [Vue integration](./frameworks/vue) uses the Vue 3 Composition API, shallow snapshot state, lifecycle hooks, and template refs.
- [Angular integration](./frameworks/angular) uses standalone components, Signals, `DestroyRef`, `AfterViewInit`, and view queries.

These recipes are maintained as documentation, not compiled framework applications. The repository intentionally does not add React, Vue, or Angular dependencies merely to render code samples. Each page states its assumptions; validate the final snippet in the consumer application's own framework, compiler, SSR, and test configuration.

Svelte, Lit, Web Components, and other DOM-capable renderers can apply the same controller contract, but the package does not publish dedicated recipes or adapters for them.

## CSS ownership

The npm package ships no CSS. Consumers apply ordinary classes through their existing styling system and decide layout, visual states, animation, branding, contrast, and forced-colors behavior.

Prefer stable consumer-owned classes over selectors that infer all visual state from ARIA attributes. Preserve a visible `:focus-visible` indicator, sufficient text and control contrast, usable pointer targets, responsive reflow, and a reduced-motion alternative. The examples on the framework pages show CSS that belongs to the consuming application and is not imported from UI Headless Runtime.

## Accessibility ownership

Snapshots expose roles, IDs, state, and relationships, while controller bindings implement behavior such as focus containment and outside interaction. The consumer still owns the rendered element type, accessible name, description, content order, error messaging, color contrast, target size, and application-level assistive-technology testing.

Apply every relevant snapshot field to the final markup. For example, a Dialog still needs a visible heading referenced by `aria-labelledby` or another valid accessible name supplied by the consumer. A framework wrapper cannot infer that product content safely.

## When an application abstraction helps

Create a small framework-specific abstraction inside the consuming application when several product components intentionally share all of the following:

- the same controller options and ownership model;
- the same semantic markup and naming policy;
- the same binding and cleanup lifecycle;
- the same consumer CSS contract; and
- tests that protect the abstraction's product-specific behavior.

Keep that abstraction local until repeated production use demonstrates a stable API. It should compose the public package entrypoint and remain owned by the application team.

## When not to create a wrapper

Do not introduce a wrapper for a single use, to hide a few lifecycle lines, or to make unlike components appear uniform. Avoid wrappers that copy snapshots, omit reason details, swallow cancellable events, invent markup, or obscure which layer owns cleanup and accessibility.

An application-local helper is not an official UI Headless Runtime adapter. Do not publish it under an official-looking package name or imply that the runtime repository tests its framework-specific rendering.

## SSR and hydration

Importing the package and creating a DOM-free controller are SSR-safe. DOM binding, focus movement, measurement, positioning, and browser event registration must wait for the client lifecycle. Use deterministic IDs when server and client markup must hydrate identically, and create per-request or per-component state instead of module-level mutable singletons.

See [SSR](./ssr), [DOM binding](./dom-binding), [controlled vs uncontrolled state](./controlled-vs-uncontrolled), and [accessibility](./accessibility) for the underlying contracts used by every recipe.
