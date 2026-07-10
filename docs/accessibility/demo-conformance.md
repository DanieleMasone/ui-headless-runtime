# Demo and documentation accessibility conformance

## Scope

This statement covers the published UI Headless Runtime surfaces:

- The interactive demo at the site root.
- The component laboratory, including scenarios, state inspection, event history, executed source, keyboard tables, and accessibility contracts.
- The generated documentation site under `/docs/`, including the User Guide, component contracts, architecture pages, and release guidance.
- The generated TypeDoc API reference and HTML coverage report where navigation, reflow, focus visibility, and linked-surface checks apply.

The npm runtime package is not a rendered product. It supplies accessibility behavior primitives and metadata, while consumers supply the final markup, styling, labels, content, and integration.

## Target

The published demo and generated documentation are designed and tested against applicable WCAG 2.2 Level AA criteria. This is a project target supported by automated checks and the review record below, not a third-party certification or a claim that the runtime package makes every consumer application conformant.

Final consumer compliance depends on the rendered application and must be evaluated in that application's complete context.

## What is covered

- Keyboard access and absence of keyboard traps.
- Visible focus, logical focus order, focus entry, focus movement, and focus restoration.
- Page headings, landmarks, skip navigation, and understandable navigation labels.
- Programmatic names, roles, values, states, and ARIA relationships.
- Text and non-text color contrast in the maintained demo themes.
- Reflow at narrow viewports, zoom-oriented layouts, text spacing resilience, and contained scrolling for code and tables.
- Pointer target size for primary navigation and laboratory controls.
- Status messages that announce concise outcomes without making full event logs live regions.
- Reduced-motion preferences and forced-colors compatibility.
- Accessible desktop and mobile navigation.

## What is not guaranteed by the runtime package alone

The runtime cannot guarantee the following in a consumer product:

- Consumer markup or landmark structure.
- Consumer-provided labels, descriptions, validation messages, or content.
- Consumer styling, final color contrast, focus indicators, reflow, target size, or motion.
- Screen-reader behavior after a consumer changes roles, relationships, DOM order, or controller bindings.
- Accessibility of third-party framework adapters or application code not maintained in this repository.

Consumers must test the final rendered experience with its real content, styles, supported browsers, input methods, and assistive technologies.

## Automated checks

The repository uses complementary checks rather than treating a single scanner as proof of conformance:

- Axe checks for the demo shell, component examples in initial and active states, and representative generated documentation pages.
- Playwright keyboard and focus assertions for navigation, dialogs, composite widgets, search, mobile controls, focus trapping, and focus restoration.
- Responsive Playwright assertions at desktop, tablet, and mobile widths, including 320 CSS pixels, with contained code/table scrolling and no document-level horizontal overflow.
- Static documentation and Pages-artifact checks for required routes, generated HTML links, the configured base path, localhost references, raw Markdown links, and workspace source-path leaks.
- Real-browser integration coverage for focus, keyboard, pointer, bubbling, composed paths, overlay stacking, and cleanup.

The relevant local gates are `npm run test:acceptance`, `npm run docs:check`, and `npm run site:check`. The CI workflow runs those checks against the production Pages artifact before deployment.

## Manual review checklist

Review version: **2026-07-10**. Status values are `tested`, `not applicable`, `consumer responsibility`, and `pending`.

| Area                                    | WCAG 2.2 criteria                     | Status                    | Review evidence or boundary                                                                                                                      |
| --------------------------------------- | ------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Keyboard operation and no traps         | 2.1.1, 2.1.2                          | `tested`                  | Demo navigation, search, overlays, and composite widgets are exercised with keyboard and focus assertions.                                       |
| Focus order and visible focus           | 2.4.3, 2.4.7, 2.4.11                  | `tested`                  | Skip navigation, route focus, modal containment/restoration, and visible focus styles are reviewed in light, dark, and forced-colors modes.      |
| Headings, landmarks, and navigation     | 1.3.1, 2.4.1, 2.4.5, 2.4.6            | `tested`                  | Demo and representative documentation pages expose a main landmark, one page heading, labelled navigation, and bypass links.                     |
| Names, roles, states, and relationships | 1.3.1, 4.1.2                          | `tested`                  | Axe and explicit role/ARIA assertions cover the shell, search, drawer, and component examples.                                                   |
| Contrast and non-text contrast          | 1.4.3, 1.4.11                         | `tested`                  | Maintained theme tokens, focus indicators, controls, and active states are checked automatically where detectable and reviewed in forced colors. |
| Reflow and text spacing                 | 1.4.10, 1.4.12                        | `tested`                  | Critical demo and documentation routes are reviewed at 320 CSS pixels; long code and tables scroll within their own region.                      |
| Pointer target size                     | 2.5.8                                 | `tested`                  | Primary shell, mobile navigation, search, theme, and laboratory controls meet the maintained minimum target sizing or spacing exception.         |
| Status messages                         | 4.1.3                                 | `tested`                  | Scenario changes, source copy, and log clearing use concise status regions; the complete event history is not an `aria-live` region.             |
| Dragging movements                      | 2.5.7                                 | `not applicable`          | The published site has no drag-only interaction.                                                                                                 |
| Authentication                          | 3.3.8                                 | `not applicable`          | The published site has no authentication flow.                                                                                                   |
| Consumer-rendered products              | All applicable criteria               | `consumer responsibility` | The runtime does not control final consumer markup, content, styling, or product context.                                                        |
| Extended screen-reader/device matrix    | Assistive-technology interoperability | `pending`                 | The maintained automated browser matrix is broader than the documented manual screen-reader/device matrix; see Known limitations.                |

## Known limitations

- The project has not undergone an independent third-party WCAG certification audit.
- Axe cannot detect every focus, reading-order, content-quality, target-size, or assistive-technology issue; explicit assertions and manual review remain necessary.
- The automated cross-browser matrix uses Chromium, Firefox, and WebKit, while the accessibility project uses Chromium. An exhaustive named screen-reader, browser, operating-system, and touch-device matrix is still pending.
- TypeDoc and coverage pages are generated by upstream tools. This project verifies their required routes, links, reflow, and representative accessibility behavior but does not control every upstream HTML implementation detail.
- New scenarios, documentation plugins, theme changes, or browser behavior can change the result and require this checklist to be reviewed again.

Report an accessibility defect through the GitHub issue tracker with the affected URL, browser, assistive technology, input method, viewport, color preference, and a minimal reproduction.

## Badge policy

The README may display a **demo a11y checked** badge only while the conformance page, automated accessibility tests, responsive assertions, and static Pages checks remain versioned and enforced in CI. The badge links to this page.

The project does not use a generic "WCAG compliant library" badge. Accessibility behavior in the runtime supports accessible implementations, but final consumer conformance remains the consumer's responsibility.
