# Migrating to 1.0

Version `1.0.0` establishes the first stable package-root API. The runtime behavior remains controller-driven and framework-agnostic, but several `0.1.x` names and low-level exports were intentionally tightened before the stability guarantee begins.

## Event contract names

Rename the two generic event types so they cannot be confused with browser globals:

```ts
import type { RuntimeEventListener, RuntimeEventSource } from 'ui-headless-runtime';
```

| `0.1.x`                   | `1.0.0`                          |
| ------------------------- | -------------------------------- |
| `EventListener<TPayload>` | `RuntimeEventListener<TPayload>` |
| `EventSource<TEvents>`    | `RuntimeEventSource<TEvents>`    |

Controller event methods and cancellable `RuntimeEvent` behavior are unchanged.

## Positioning options

Rename `PositionOptions` to `FloatingPositionOptions`. The old name collided with the DOM Geolocation API and produced an ambiguous declaration-rollup alias. `calculatePosition()`, `autoUpdatePosition()`, component `positioning` options, `PositionResult`, and `VirtualAnchor` retain their behavior.

## Removed package-root primitives

The following low-level ownership and implementation helpers are no longer exported from the package root:

- resource and event internals: `createDisposableScope`, `DisposableScope`, `createTimeoutManager`, `TimeoutManager`, `createEventEmitter`, and `TypedEventEmitter`;
- state and collection internals: `createControllableValue`, `ControllableValue`, `createCollection`, `CollectionRegistry`, `findTypeaheadMatch`, `fuzzyScore`, and `normalizeText`;
- DOM, focus, and ID internals: `createRuntimeId`, `eventTargets`, `getOwnerDocument`, `getOwnerWindow`, `getScrollableAncestors`, `inertSiblings`, `listen`, `lockDocumentScroll`, `observeOutsideInteraction`, `OutsideInteractionOptions`, `focusById`, `focusInitial`, `getTabbableElements`, `restoreFocus`, and `trapFocus`.

Use the public component factories for state, focus, collections, and overlay behavior. Use browser APIs or application-owned utilities for unrelated generic resource management. `CollectionItem`, `ControllableValueOptions`, `hasDOM()`, and the positioning utilities remain public because consumers need them when defining controller input and rendering integrations.

Deep imports are unsupported and are blocked by the package `exports` map; do not replace a removed root import with a path into `dist` or `src`.

## Component contract changes

- Combobox selection callbacks and events now use `ComboboxSelectReason`. Internal Listbox reasons no longer leak through the Combobox API, and typeahead selection is reported as `keyboard`.
- Command Palette `open()` and `close()` use `OpenChangeReason`. A configured shortcut reports the existing `keyboard` open reason, and `shortcut` is no longer a `CommandPaletteReason` value.
- `MenuSnapshot.contentId` provides the stable menu content ID for `aria-controls`.
- `NavigationMenuItem` contains navigation registration fields plus `hasContent`; Menu-only fields such as `kind`, `value`, and `submenuId` are not part of its contract.
- Navigation Menu accepts an optional deterministic `id` and exposes `NavigationMenuSnapshot.contentId` for the shared content relationship.
- `NavigationMenuReason` includes `focus-out`, so Tab and focus-leave dismissal are no longer misreported as `outside-pointer`.

## Upgrade checklist

1. Replace renamed type imports and update exhaustive reason switches.
2. Remove imports of package-root implementation helpers and bind behavior through controllers.
3. Render Menu and Navigation Menu `aria-controls` from the controller snapshot instead of duplicating IDs.
4. Run TypeScript strict checking and product keyboard, focus, and accessibility tests against the upgraded package.
5. Call every binding release function before `destroy()`; repeated cleanup remains safe.

The package does not ship framework adapters or CSS. Rendering, styling, responsive behavior, accessible names, and final accessibility validation remain consumer responsibilities.
