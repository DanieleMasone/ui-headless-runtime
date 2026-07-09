# User Guide

UI Headless Runtime is a small TypeScript library of headless controllers for interface behavior. It supplies state machines, keyboard models, focus behavior, ARIA metadata, overlay coordination, collection navigation, positioning, and cleanup. Your application supplies markup, rendering, styling, content, and final accessibility validation.

Use this guide when you want to integrate the runtime into a product. Use the architecture section when you want design rationale and trade-offs.

## Start here

- [Getting started](./getting-started)
- [Core concepts](./core-concepts)
- [Controllers](./controllers)
- [Rendering contract](./rendering-contract)
- [State management](./state-management)
- [Controlled vs uncontrolled](./controlled-vs-uncontrolled)
- [Events and reasons](./events-and-reasons)
- [DOM binding](./dom-binding)
- [Accessibility](./accessibility)
- [Focus management](./focus-management)
- [Overlays](./overlays)
- [Collections](./collections)
- [Positioning](./positioning)
- [SSR](./ssr)
- [Framework integration](./framework-integration)
- [Testing](./testing)
- [Troubleshooting](./troubleshooting)
- [Release and package](./release-and-package)

## What the runtime is not

It is not a component framework, renderer, CSS system, animation library, or accessibility certification. It does not ship React/Vue/Angular/Svelte adapters. The same controller API is designed to fit those environments through ordinary lifecycle hooks.
