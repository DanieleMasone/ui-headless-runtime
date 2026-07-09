# Overlays

Overlay controllers coordinate Escape, outside interaction, nested layers, scroll locking, and inert background behavior where applicable.

## Topmost rule

Only the topmost overlay should react to Escape or outside dismissal. This prevents parent dialogs or popovers from closing while a child overlay is active.

## Modal effects

Dialog modal mode can trap focus, lock scroll, and inert background siblings. These effects are reference-counted so nested dialogs do not unlock the page too early.

## Outside interaction

Outside interaction uses the owner document and composed event paths so portals and shadow DOM can be handled by the caller's DOM realm.
