# Custom renderer

A renderer needs only three capabilities: read a snapshot, subscribe to future snapshots, and forward user events to commands. It may target DOM, canvas accessibility mirrors, server templates, or a framework VDOM.

Keep controller identity stable across renders. Diff semantic snapshot fields into markup instead of cloning component logic. Bind overlay DOM after renderer commit and release old bindings before replacing nodes. Never infer open/selected state independently from the controller.
