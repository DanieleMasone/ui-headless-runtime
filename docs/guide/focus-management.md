# Focus management

Focus behavior is explicit and pattern-specific.

## Overlays

Dialog can move focus into content, trap Tab in modal mode, and restore focus to a connected trigger on close. Popover can keep focus on the trigger or move into content depending on options. Tooltip never moves focus.

## Composites

Tabs, Menu, Accordion, Listbox, Combobox, Tree View, and Navigation Menu use shared navigation concepts. Disabled items are skipped. Home and End move to collection edges where the pattern supports it.

## Cleanup

Focus restoration is guarded. If the trigger was removed before cleanup, the runtime avoids focusing a stale node.
