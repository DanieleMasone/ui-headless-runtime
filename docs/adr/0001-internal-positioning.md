# ADR 0001: Internal positioning engine

Status: accepted.

## Context

Popover, Tooltip, Dropdown Menu, Context Menu, Combobox, and Navigation Menu need consistent viewport coordinates, flip, shift, RTL, virtual anchors, and auto-update cleanup. The runtime must remain renderer- and CSS-agnostic.

## Decision

Use a small internal geometry engine and zero runtime dependencies. The ESM bundle is approximately 17 kB gzip for the entire library; positioning is a small fraction. Coordinates and metadata are returned to consumers rather than applied.

## Consequences

There is no third-party lock-in or transitive runtime supply chain. The engine intentionally omits advanced polygonal boundaries, middleware ecosystems, and arrow geometry. A future adapter can call a custom positioning implementation without changing component rendering.

Floating UI was considered. It is mature and broader, but its additional API and dependency are unnecessary for the supported placement contract. If collision requirements materially expand, this ADR must be revisited with bundle measurements and migration analysis.
