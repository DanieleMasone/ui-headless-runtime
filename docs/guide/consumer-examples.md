# Consumer examples

## Purpose

The consumer examples are standalone applications that install the published
`ui-headless-runtime@^1.0.0` package through its public package root. They complement the
[framework integration recipes](./framework-integration) with compile-verified applications that
own their framework lifecycle, markup, rendering, and styling.

## What they prove

Together, the examples provide executable evidence for:

- real npm package consumption;
- framework lifecycle ownership;
- DOM binding and cleanup;
- controlled state;
- overlay and collection behavior;
- keyboard event forwarding;
- accessibility metadata;
- dynamic registration and asynchronous behavior; and
- isolation from workspace source and package internals.

## What they are not

The examples are not official adapters, framework packages, alternate demos, part of the npm
package, part of the runtime public API, or live framework demos. They do not add framework
dependencies to the runtime or replace the renderer-neutral controller contract.

## Examples

| Framework | Source                                                                                                                     | Controllers          | What it demonstrates                                                                                   |
| --------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------ |
| React     | [react-vite](https://github.com/DanieleMasone/ui-headless-runtime/tree/main/examples/consumers/react-vite)                 | Dialog, Tabs         | Effect-owned controllers, external state, modal behavior, keyboard interaction, and dynamic tabs       |
| Vue       | [vue-vite](https://github.com/DanieleMasone/ui-headless-runtime/tree/main/examples/consumers/vue-vite)                     | Combobox, Toast      | Composition lifecycle, async options, stale-response protection, positioning, and timed toast behavior |
| Angular   | [angular-standalone](https://github.com/DanieleMasone/ui-headless-runtime/tree/main/examples/consumers/angular-standalone) | Accordion, Tree View | Signals, `DestroyRef` cleanup, hierarchical collections, keyboard interaction, and dynamic nodes       |

## Functional coverage matrix

| Framework | Controllers          | Controlled state                                     | Lifecycle cleanup                                                                         | Overlay                                                       | Collection                                       | Keyboard                                  | Accessibility metadata                                                          | Dynamic behavior                                                                     |
| --------- | -------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| React     | Dialog, Tabs         | React can accept or reject Tabs selection requests   | Releases bindings, registrations, subscriptions, and controllers                          | Modal focus, Escape, outside dismissal, and focus restoration | Dynamic Tabs with a disabled item                | Explicit Tabs handler                     | Dialog role and IDs; tab and panel relationships                                | A tab can be removed and restored                                                    |
| Vue       | Combobox, Toast      | Vue can accept or reject Combobox selection requests | Releases bindings, option registrations, subscriptions, timers, and controllers           | Positioned Combobox popup with dismissal behavior             | Async options with disabled results              | Input, composition, and Combobox handlers | Active descendant, controls, expanded/loading state, and live-region politeness | Stale async results are rejected; Toast supports promise and pause/resume lifecycles |
| Angular   | Accordion, Tree View | Runtime-owned state rendered through Angular Signals | Releases item and node registrations, subscriptions, and controllers through `DestroyRef` | Not applicable                                                | Accordion items and hierarchical Tree View nodes | Explicit Accordion and Tree handlers      | Expanded/disabled relationships and tree level, set size, and position          | A Tree child can be registered and unregistered at runtime                           |

## Verification

Run the repository-level verifier:

```sh
npm run examples:verify
```

For every committed consumer, the verifier:

- requires the manifest dependency `ui-headless-runtime@^1.0.0`;
- requires the lockfile to resolve the package from the npm registry;
- rejects `workspace:` and `file:` dependencies;
- rejects deep `ui-headless-runtime/*` imports and references to repository `packages/` paths;
- installs from the committed lockfile with `npm ci`; and
- runs the consumer's typecheck and production build.

## Publishing and release boundary

This Markdown page is generated as public HTML in the User Guide. The consumer source projects
remain under `examples/consumers`, and their React, Vue, and Angular builds are not copied into the
GitHub Pages artifact as live applications. The examples remain outside the npm package, its
tarball, and the runtime public API. The primary interactive demo remains the Vanilla TypeScript
component laboratory.
