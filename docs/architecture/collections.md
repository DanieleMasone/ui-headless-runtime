# Collections

The ordered registry provides dynamic registration, replacement tokens, safe stale cleanup, enabled edges, looped movement, normalized typeahead, and stable IDs. Menus, Accordions, Tabs, Listbox, Combobox, Tree View, Command Palette, and Navigation Menu build on it.

Disabled items remain in semantic snapshots but are skipped by navigation and activation. Registering the same ID replaces metadata; cleanup from the stale registration cannot remove the replacement. Active-item removal chooses a valid enabled neighbor where the pattern requires it.

Tree View adds parent IDs, visible preorder traversal, cycle protection, level, set size, and position in set.
