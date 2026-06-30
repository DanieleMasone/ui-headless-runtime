# State model

`createControllableValue()` is the only ownership primitive. In uncontrolled mode it stores the value internally. In controlled mode `getValue()` is authoritative, `onValueChange()` receives requests, and `subscribeValue()` invalidates the owning controller when the external store changes.

Updates carry a closed reason union and optional native event. Duplicate values do not notify. Re-entrant writes are queued and committed atomically. Controller snapshots are shallow-frozen before publication; listeners observe a deterministic sequence and may safely unsubscribe while publishing.

Controlled callbacks should update their external store synchronously or arrange for `subscribeValue()` to notify later. The runtime never invents an external value.
