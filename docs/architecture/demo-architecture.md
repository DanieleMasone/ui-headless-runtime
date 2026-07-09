# Demo architecture

The demo is a Vanilla TypeScript Vite application and imports only `ui-headless-runtime`. A typed component registry drives routes, sidebar, catalogue, search, scenario metadata, keyboard tables, accessibility notes, and API links.

Hash routing supports direct GitHub Pages refresh without server rewrites. The Command Palette controller powers client-side documentation search. Every component page uses the shared laboratory layout, lazily loaded component-specific example modules, a safe state serializer, and a bounded event log.

Styles live only under `apps/demo/src/styles`, use cascade layers and custom properties, and support light, dark, system, reduced motion, increased contrast, and forced colors. The theme is applied in `index.html` before the visible application renders.
