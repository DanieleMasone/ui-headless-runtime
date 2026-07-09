# Listbox

## Overview and use cases

Listbox selects one or several values from a static or dynamic option collection. Use native select when it meets product requirements.

## Options, snapshot, and commands

Configure selection mode, looping, ID, and controlled selected values. Register options, set active ID, select/toggle, and forward keyboard events. Snapshot exposes role, multiselect state, active descendant, values, and option semantics.

## Events, reasons, keyboard, and ARIA

beforeSelect may cancel pointer, keyboard, typeahead, or programmatic selection. Arrow keys, Home/End, normalized typeahead, Enter, and Space are supported. Render listbox/option roles and `aria-activedescendant`; disabled options remain semantic but inactive.

## Cleanup and virtualization

Registration cleanup supports dynamic and virtualized windows while stable IDs preserve active-descendant compatibility. Consumers announce selection guidance where multi-select interaction is non-obvious.

Single, multiple, and disabled examples execute from the component-specific [`listbox.ts` example module](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/listbox.ts).
