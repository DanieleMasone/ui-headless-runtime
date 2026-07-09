# Toast

## Overview and use cases

Toast provides transient status announcements without moving focus. Persistent or actionable critical information needs an inline region or dialog.

## Options, snapshot, and queue

Configure maximum visible records or controlled queue ownership. Show deduplicates by ID; update, dismiss, pause, resume, and promise lifecycle are supported. Priority sorts descending with insertion sequence as deterministic tie-breaker.

## Events, reasons, timers, and promises

beforeShow is cancellable. Show/update/dismiss/stateChange identify programmatic, timeout, dismiss, promise, or update causes. Pause preserves remaining duration. Promise returns the original value or original rejection while updating loading/success/error status.

Timeout ownership begins when a record enters the deterministic queue, including records outside the current visible capacity. Use `duration: null` for queued work that must remain until it becomes visible or is explicitly dismissed.

## Accessibility and cleanup

Render polite records as status and assertive records as alert. Do not auto-focus. Provide a reachable dismiss control for persistent actionable content. Destroy clears every timer and external subscription.

The Pages laboratory runs priority, promise, and pause/resume examples from the same [`toast.ts` example module](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/toast.ts) shown in its source panel.
