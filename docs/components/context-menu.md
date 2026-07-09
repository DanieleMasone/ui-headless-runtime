# Context Menu

## Overview and use cases

Context Menu reuses Menu behavior with a pointer-coordinate virtual anchor. It supports contextual actions where an equivalent keyboard path is also available.

## API, state, and reasons

`handleContextMenu` prevents the native menu only when invoked and opens with context-menu reason. `handleKeyboardOpen` recognizes ContextMenu and Shift+F10 and anchors to the trigger. All Menu snapshot, controlled state, lifecycle, submenu, and selection contracts apply.

## ARIA, keyboard, focus, and cleanup

Render role menu/menuitem and an accessible conventional action alternative. Arrow keys, Home/End, typeahead, selection, and Escape come from Menu. Release the returned binding and destroy the controller. Mobile long-press behavior is intentionally consumer/platform-specific.

Pointer-coordinate, keyboard-open, and submenu examples execute from the component-specific [`context-menu.ts` example module](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/context-menu.ts).
