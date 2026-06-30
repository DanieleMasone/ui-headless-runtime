# Focus management

Dialogs, popovers, menus, tooltips, and command palettes share tabbable discovery, initial/fallback focus, containment, focus-by-ID, and restoration. A modal dialog focuses the requested connected target, then the first tabbable descendant, then its content container with `tabindex=-1`.

Tab containment wraps first/last focus and handles an empty scope. Restoration is attempted only for a connected, enabled target. Removing a trigger before close is therefore safe. Collection widgets may use roving DOM focus or `aria-activedescendant`; their item traversal remains in the collection layer.

The consumer must render a logical DOM order and visible focus indicator.
