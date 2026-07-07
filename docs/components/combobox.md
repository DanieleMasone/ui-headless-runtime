# Combobox

## Overview and use cases

Combobox combines editable text with Listbox suggestions. It supports local filtering, custom filtering, async sources, controlled input and selected values, and virtualized option IDs.

## Snapshot, commands, events, and reasons

Snapshot exposes input/query/selection, active option, loading, composing, empty, control ownership, listbox ID, options, and position. Register, bind, set input, refresh, select, and forward input/keyboard/composition. Open, query, and cancellable selection events use closed reason unions.

## Async and IME safety

Each request gets an AbortController and generation. A stale or destroyed request cannot overwrite a later query. Composition defers filtering until compositionend. Non-abort loader errors reject `refresh()` and remain consumer-handled.

## ARIA, keyboard, cleanup, and limitations

Render an input role combobox controlling the listbox. Arrow keys navigate, Enter selects, Escape closes. Release registration/binding and destroy to abort work. Consumers own debounce, network caching, display-value policy, and error UI.

The local, stale-response, and empty-state examples execute directly from [`createExample()`](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/create-example.ts); the async scenario deliberately gives the earlier query a longer latency.
