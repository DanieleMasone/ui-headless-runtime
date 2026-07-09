# Collections

Collection-driven controllers use ordered registration instead of querying DOM order at command time.

## What registration stores

- Item ID.
- Text value for typeahead.
- Disabled state.
- Parent relationship for trees and submenus.
- Consumer metadata needed by snapshots.

## Why it matters

Dynamic registration lets virtualized or conditional rendering stay predictable. When the active item is removed, controllers choose the next valid item instead of leaving stale focus metadata behind.

Typeahead and fuzzy matching normalize text before comparison. Consumers should provide stable, user-visible labels.
