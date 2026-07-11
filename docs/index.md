# UI Headless Runtime

Behavioral infrastructure for interfaces you own. This documentation covers the architecture, accessibility contracts, framework integration, packaging, and release operations for the headless TypeScript runtime.

UI Headless Runtime exposes typed controllers with immutable state and DOM bindings without shipping markup, CSS, or framework adapters. The public laboratory uses those same package exports and shows live state, real events, executed source, keyboard behavior, and consumer accessibility responsibilities.

## Start here

- [User Guide](./guide/) for installation, controllers, rendering, state, DOM binding, SSR, and testing.
- [Component contracts](./components/dialog) for component-specific options, state, commands, keyboard behavior, focus, and limitations.
- [Architecture overview](./architecture/overview) for shared state, lifecycle, focus, collections, overlays, positioning, and cleanup.
- [Framework integration](./guide/framework-integration) for the shared lifecycle and CSS/accessibility ownership boundary.
- Consumer-side recipes for [React](./guide/frameworks/react), [Vue](./guide/frameworks/vue), and [Angular](./guide/frameworks/angular), without official adapters or framework dependencies in the runtime package.
- [Demo and documentation accessibility conformance](./accessibility/demo-conformance) for scope, checks, limitations, and the WCAG 2.2 AA applicable-criteria target.

## Public surfaces

- [Interactive component laboratory](https://danielemasone.github.io/ui-headless-runtime/)
- [TypeDoc API reference](https://danielemasone.github.io/ui-headless-runtime/api/)
- [Coverage report](https://danielemasone.github.io/ui-headless-runtime/coverage/)
- [Release operations](./releasing)

## Quality model

The repository gates strict TypeScript, formatting, linting, unused-code checks, unit coverage, real-browser integration, cross-browser production E2E, axe plus manual accessibility assertions, API reports, generated documentation, package consumers, and the composed GitHub Pages artifact.

The runtime provides accessibility behavior primitives. The published demo and generated documentation are designed and tested against applicable WCAG 2.2 AA criteria. Final consumer conformance still depends on the rendered product's markup, labels, content, styling, layout, and assistive-technology validation.
