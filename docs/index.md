---
layout: home

hero:
  name: UI Headless Runtime
  text: Behavioral infrastructure for interfaces you own
  tagline: Architecture, accessibility contracts, framework integration, packaging, and release operations for the headless TypeScript runtime.
  actions:
    - theme: brand
      text: Architecture
      link: /architecture/overview
    - theme: alt
      text: Component contracts
      link: /components/dialog

features:
  - title: Renderer-neutral
    details: Typed controllers expose immutable state and DOM bindings without shipping markup, CSS, or framework adapters.
  - title: Accessibility-engineered
    details: Keyboard, focus, relationships, overlay ordering, and cleanup are explicit contracts rather than hidden rendering assumptions.
  - title: Artifact-verified
    details: API reports, tarball consumers, browser tests, production E2E, and accessibility checks gate changes and releases.
---

## Documentation map

- [Architecture and lifecycle](./architecture/overview.md)
- [Component contracts](./components/dialog.md)
- [TypeScript integration](./guides/typescript.md)
- [Accessibility conformance](./accessibility/conformance.md)
- [Release operations](./releasing.md)

The [interactive laboratory](https://danielemasone.github.io/ui-headless-runtime/) uses the package entrypoint and exposes live state, real events, executed source, keyboard behavior, and accessibility responsibilities for every controller.
