# Testing

Test the integrated UI, not only the controller.

## Consumer-side checklist

- Keyboard paths: Tab, Shift+Tab, Escape, Arrow keys, Home, End, Enter, Space.
- Focus entry, movement, trap, and restoration.
- Names, roles, states, and relationships.
- Disabled state.
- Controlled-state rejection.
- Cleanup after unmount.
- SSR import when applicable.

## Library gates

This repository uses unit tests, Vitest browser tests, Playwright E2E, accessibility tests, TypeDoc validation, API Extractor, package smoke tests, and static site checks.

Coverage thresholds are global and must stay at or above 95% for statements, branches, functions, and lines.
