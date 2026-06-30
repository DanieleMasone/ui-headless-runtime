# DOM and SSR

Module evaluation does not read `window`, `document`, `navigator`, `HTMLElement`, `Element`, or `matchMedia`. DOM requirements are resolved when binding or invoking a DOM utility. The owner document comes from bound nodes, allowing iframes and multiple documents.

The DOM layer owns listener registration, composed-path containment, outside interactions, scrollable ancestor discovery, reference-counted scroll lock, sibling inerting, and cleanup. It uses explicit cleanup functions; no observer, timer, or document listener survives destruction.

Consumers performing SSR create controllers normally, render semantic attributes from snapshots, and bind DOM after hydration.
