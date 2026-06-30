# Custom positioning

The built-in engine returns viewport coordinates and collision metadata. Apply only the dynamic coordinates inline; keep visual CSS centralized.

For a custom engine, bind the same anchor/content lifecycle, subscribe to controller open state, start the external auto-update only while open, and dispose it on close/unmount. Virtual anchors implement `getBoundingClientRect()` and may provide a context element for document/direction/scroll resolution.

Do not install global observers or poll layout. Batch reads before writes to avoid layout thrashing.
