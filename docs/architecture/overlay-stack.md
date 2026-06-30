# Overlay stack

Each owner document has an on-demand overlay stack stored in a `WeakMap`. No document is accessed during import. The topmost entry alone handles Escape. Opening or closing synchronizes parent `topmost` metadata.

Outside pointer and focus logic treats explicit branches and higher stacked overlays as inside the parent. This prevents a nested menu, popover, or dialog from dismissing its ancestor. Modal scroll locks are reference-counted and sibling inert state is restored exactly.

Binding cleanup removes the stack entry even if the controller remains alive; destruction also releases the active binding.
