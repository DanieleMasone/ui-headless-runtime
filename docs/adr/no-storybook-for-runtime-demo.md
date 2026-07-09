# Decision

Do not add Storybook to this repository at this stage.

# Context

UI Headless Runtime is a renderer-free behavior/runtime library. The demo is a
Vanilla TypeScript laboratory that imports only the public package API and
publishes in the same GitHub Pages artifact as the documentation, API reference,
and coverage report.

# Considered option

Storybook can render isolated UI states and provides docs/testing workflows, but
it would add a parallel demo/docs surface and a second example registry for a
project whose primary artifact is headless controller behavior rather than
visual components.

# Decision drivers

- Keep zero runtime visual opinion.
- Avoid duplicating examples and metadata.
- Keep the Pages artifact simple.
- Preserve framework-agnostic positioning.
- Avoid extra CI cost and dependency maintenance.
- Keep the source panel exact by loading the same module used by the live demo.
- The current demo already provides state inspector, event log, source, docs,
  API, coverage, E2E checks, and accessibility checks.

# Consequences

Storybook can be reconsidered later only if the repository adds visual wrappers
or a framework-specific adapter package whose behavior cannot be represented
clearly in the existing Vanilla TypeScript laboratory.
