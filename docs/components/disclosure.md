# Disclosure

## Overview and use cases

Disclosure is the shared expanded/collapsed primitive for optional inline content. Collapsible is its intent-named alias.

## Options, snapshot, commands, and events

Options cover deterministic ID, disabled state, and controlled/uncontrolled expansion. Snapshot trigger/panel metadata contains IDs, `aria-controls`, `aria-expanded`, labelled-by, hidden, and region role. Expand/collapse/toggle, setDisabled, click, and keyboard forwarding are exposed with cancellable lifecycle.

## Keyboard, focus, and cleanup

Enter and Space toggle when a non-native trigger needs forwarding; native button activation can use click. Focus remains on the trigger. Destroy is idempotent and external subscriptions are released. Consumers should use a real button and meaningful heading context.

Uncontrolled, controlled, and disabled examples execute from the shared [`createExample()` source](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/create-example.ts).
