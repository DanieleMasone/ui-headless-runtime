# Cleanup and ownership

Every listener, timer, observer, state subscription, overlay entry, focus scope, and scroll lock has one owner. `createDisposableScope()` releases resources in reverse order exactly once. Open-only resources are recreated for each transition and released immediately on close.

Controller destruction releases external subscriptions before references can leak. Registration cleanup uses tokens so a stale cleanup cannot remove replacement metadata. Async Combobox work uses `AbortController` and request generations so destruction or a newer query invalidates the older result.

`createTimeoutManager()` owns one replaceable timeout and clears its handle before invoking the callback, which makes re-entrant scheduling deterministic. Menu typeahead, Tooltip delay, Listbox/Tree typeahead, and Navigation Menu intent all use this primitive. Commands, registrations, subscriptions, and delayed callbacks created after `destroy()` are inert; the final frozen snapshot remains readable.
