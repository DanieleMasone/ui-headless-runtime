# Positioning

The shared engine accepts real or virtual anchors, placement, offset, collision padding, flip, shift, RTL, and explicit viewport dimensions. It returns coordinates and collision metadata; it never writes visual styles.

`autoUpdatePosition()` observes owner-window resize, scrollable ancestors, and element resize when `ResizeObserver` exists. Cleanup removes listeners and disconnects the observer. It only runs while an overlay is open.

The implementation is dependency-free; rationale and trade-offs are recorded in [ADR 0001](../adr/0001-internal-positioning.md).
