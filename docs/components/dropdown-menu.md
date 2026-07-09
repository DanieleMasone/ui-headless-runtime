# Dropdown Menu

## Overview and use cases

Dropdown Menu applies trigger behavior and anchored positioning to the Menu engine. Use it for action menus, not form value selection.

## API and state

`createDropdownMenu(MenuOptions)` returns the complete Menu controller plus `handleTrigger`. State may be controlled or uncontrolled. Dynamic item registration, selection events, typeahead, disabled items, separators, and submenus are inherited without parallel logic.

## DOM, ARIA, keyboard, and focus

Bind trigger and menu content. Pointer click, ArrowDown, Enter, or Space opens; focus starts on the first enabled item. Escape/outside interaction closes and restores focus. Render the WAI-ARIA Menu Button relationship and accessible trigger name.

## Cleanup, edge cases, and limitations

Release item registrations and binding, then destroy. The consumer renders submenu DOM and uses the exposed submenu ID. Menu content should contain actions, not arbitrary form controls.

Pointer/keyboard trigger, disabled item, and submenu examples execute from the component-specific [`dropdown-menu.ts` example module](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/dropdown-menu.ts).
