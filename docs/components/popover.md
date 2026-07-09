# Popover

## Overview and use cases

Use Popover for anchored contextual content. Use Tooltip for non-interactive descriptions and Dialog for interruptive modal workflows.

## Options and snapshot

Options cover controlled open state, focus-out dismissal, initial content focus, restoration, IDs, and shared positioning. The snapshot exposes open/topmost state and coordinates with final placement, flip, and shift metadata.

## Commands, events, and reasons

`open`, `close`, `toggle`, `bind`, and `updatePosition` use the common lifecycle. Before-events may cancel transitions; reasons identify trigger, Escape, outside pointer, focus out, or programmatic calls.

## DOM, ARIA, keyboard, and focus

Bind trigger, content, optional virtual anchor, and descendant branches. Escape closes only the topmost overlay. Outside pointer/focus ignores higher nested overlays. The consumer chooses final role and accessible label appropriate to content.

Opening does not move focus by default. Set `focusContent` only when the popover pattern requires focus entry; outside-pointer dismissal does not restore focus, while explicit close may restore the connected trigger when configured.

## Cleanup and limitations

Binding owns document listeners, resize/scroll observation, and focus behavior only while open. Coordinates are viewport-relative; the consumer applies styles and animation.

The demo scenarios exercise anchored, viewport-edge, and controlled-state behavior using the component-specific [`popover.ts` example module](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/popover.ts) executed by the Pages site.
