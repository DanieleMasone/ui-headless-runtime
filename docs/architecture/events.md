# Events

The shared emitter supports `on`, `off`, `once`, unsubscribe functions, cancellation, deterministic registration order, and safe listener mutation during emission. It snapshots the listener set before delivery.

`beforeOpen`, `beforeClose`, `beforeSelect`, and component-specific `before*` events may call `preventDefault()`. Informational events follow the accepted mutation. Every material mutation contains a typed reason rather than a free-form string.

Listeners are owned by their controller and removed by `destroy()`. Event payloads contain state and causes, never renderer-specific objects.
