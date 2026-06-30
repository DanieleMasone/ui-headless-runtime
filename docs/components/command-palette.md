# Command Palette

## Overview and use cases

Command Palette combines modal Dialog focus, dynamic commands, fuzzy matching, grouping, and collection navigation without imposing a renderer.

## Options and snapshot

Configure Dialog state, global shortcut, controlled query, and matcher. Snapshot exposes open/query, active ID, score-ordered commands, empty state, and ownership flags.

## Commands, events, keyboard, and focus

Register, bind, bindShortcut, open/close, setQuery, select, and forward keydown. beforeSelect can cancel invocation. Arrow keys/Home/End navigate, Enter invokes, Escape closes, and Control/Command+K is the default shortcut.

## Cleanup and limitations

Bind the shortcut to an explicit owner document and release it. Destroy removes commands, dialog resources, and external state subscriptions. Command errors remain the command owner's responsibility; async rejections are prevented from becoming unhandled.

Search, grouping, and empty-state examples execute from the shared [`createExample()` source](../../apps/demo/src/examples/create-example.ts).
