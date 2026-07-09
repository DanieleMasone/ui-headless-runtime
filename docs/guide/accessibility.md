# Accessibility

UI Headless Runtime provides behavior and metadata needed for accessible patterns. It does not make the rendered product automatically conformant.

## Runtime responsibilities

- Keyboard models.
- Focus movement and restoration.
- Roving tabindex and active descendant patterns.
- Stable ID relationships.
- Overlay ordering.
- Disabled item behavior.
- Live announcement metadata.

## Consumer responsibilities

- Visible labels and accessible names.
- Correct semantic markup.
- Content quality.
- Contrast and forced-colors behavior.
- Zoom and reflow.
- Assistive-technology testing in the final UI.

Avoid claims such as "fully WCAG compliant" for the library alone. Accessibility depends on the integrated product.
