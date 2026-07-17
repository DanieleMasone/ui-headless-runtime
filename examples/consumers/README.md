# Framework consumer examples

These standalone applications compile real framework integrations against the published
`ui-headless-runtime` package. They complement the conceptual framework recipes with executable
evidence for lifecycle ownership, DOM binding, controlled state, keyboard behavior, accessibility
metadata, collections, overlays, and dynamic updates.

They are deliberately small, but they are not official adapters or alternate demo applications.
Each consumer owns its controller lifecycle, markup, rendering, styling, and accessibility
decisions. The main project demo remains the Vanilla TypeScript component laboratory.

The published [Consumer examples guide](https://danielemasone.github.io/ui-headless-runtime/docs/guide/consumer-examples.html)
is the public documentation reference. This repository README remains the source-level runbook for
maintainers and contributors working with the standalone projects.

## Verify all consumers

From the repository root:

```sh
npm run examples:verify
```

The verifier checks dependency and import boundaries, installs each project from its committed
lockfile, typechecks it, and produces a release build. It rejects workspace/file dependencies,
repository source imports, deep package imports, and a runtime dependency other than `^1.0.0`.

To run one project independently, change to its directory and execute the listed commands:

| Framework | Directory                               | Commands                                       |
| --------- | --------------------------------------- | ---------------------------------------------- |
| React     | `examples/consumers/react-vite`         | `npm ci`, `npm run typecheck`, `npm run build` |
| Vue       | `examples/consumers/vue-vite`           | `npm ci`, `npm run typecheck`, `npm run build` |
| Angular   | `examples/consumers/angular-standalone` | `npm ci`, `npm run typecheck`, `npm run build` |

## Functional coverage

| Framework | Controllers          | Controlled state                                                     | Lifecycle cleanup                                                                     | Overlay                                               | Collection                                        | Keyboard                                                    | Accessibility metadata                                                      | Dynamic behavior                                                              |
| --------- | -------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| React     | Dialog, Tabs         | Tabs requests can be accepted or rejected by external React state    | Releases Dialog binding, registrations, subscriptions, and controllers                | Modal focus, Escape, outside dismissal, restore focus | Dynamic Tabs with a disabled item                 | Explicit Tabs handler                                       | Dialog IDs/role/modal state; tab/panel relationships and tabindex           | Metrics tab registration can be removed and restored                          |
| Vue       | Combobox, Toast      | Combobox selection is Vue-owned and can reject runtime requests      | Releases binding, option registrations, subscriptions, timers, and controllers        | Bound Combobox popup positioning and dismissal        | Async Combobox options with disabled results      | Explicit input, composition, and Combobox keyboard handlers | Active descendant, controls, expanded/loading state, live-region politeness | Stale async responses are rejected; Toast promise and pause/resume lifecycles |
| Angular   | Accordion, Tree View | Not applicable; runtime-owned state rendered through Angular Signals | Releases item/node registrations, subscriptions, and controllers through `DestroyRef` | Not applicable                                        | Accordion and hierarchical Tree View registration | Explicit Accordion and Tree handlers                        | Expanded/disabled relationships and tree level/set/position metadata        | A Tree child can be registered and unregistered at runtime                    |

## Boundary policy

- Every app depends on `ui-headless-runtime` from npm using `^1.0.0`; manifests may not use
  `workspace:` or `file:` dependency specifiers.
- The apps are outside the root npm workspaces and outside the core `npm run ci` sequence.
- No app imports repository source, package internals, runtime CSS, or framework adapters.
- Framework dependencies stay inside these private consumer projects and never enter the runtime.
- The examples are excluded from the published package tarball.
