export type ComponentId =
  | 'dialog'
  | 'popover'
  | 'dropdown-menu'
  | 'context-menu'
  | 'tooltip'
  | 'accordion'
  | 'tabs'
  | 'disclosure'
  | 'toast'
  | 'command-palette'
  | 'menu'
  | 'listbox'
  | 'combobox'
  | 'tree-view'
  | 'navigation-menu'
  | 'collapsible';

interface ExampleScenario {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

interface KeyboardInteraction {
  readonly keys: string;
  readonly action: string;
}

export interface DemoComponentDefinition {
  readonly id: ComponentId;
  readonly name: string;
  readonly summary: string;
  readonly category: 'Overlay' | 'Disclosure' | 'Selection' | 'Feedback' | 'Navigation';
  readonly status: 'stable' | 'experimental';
  readonly route: string;
  readonly scenarios: readonly ExampleScenario[];
  readonly keyboardInteractions: readonly KeyboardInteraction[];
  readonly accessibilityNotes: readonly string[];
  readonly apiPath: string;
  readonly pattern: string;
  readonly accessibility: {
    readonly roles: string;
    readonly accessibleName: string;
    readonly ariaState: string;
    readonly relationships: string;
    readonly focusEntry: string;
    readonly focusMovement: string;
    readonly focusExit: string;
    readonly screenReader: string;
    readonly consumerResponsibilities: string;
    readonly limitations: string;
  };
}

const scenario = (id: string, label: string, description: string): ExampleScenario => ({
  id,
  label,
  description,
});

const keyboard = (keys: string, action: string): KeyboardInteraction => ({ keys, action });

const define = (
  id: ComponentId,
  name: string,
  summary: string,
  category: DemoComponentDefinition['category'],
  pattern: string,
  scenarios: readonly ExampleScenario[],
  keyboardInteractions: readonly KeyboardInteraction[],
  accessibilityNotes: readonly string[],
  status: DemoComponentDefinition['status'] = 'stable',
): DemoComponentDefinition => ({
  id,
  name,
  summary,
  category,
  status,
  route: `/components/${id}`,
  scenarios,
  keyboardInteractions,
  accessibilityNotes,
  apiPath: `api/functions/create${name.replaceAll(' ', '')}.html`,
  pattern,
  accessibility: {
    roles: pattern,
    accessibleName: 'The consumer supplies a visible label or explicit accessible name.',
    ariaState: accessibilityNotes[0] ?? 'Apply state from the immutable controller snapshot.',
    relationships:
      accessibilityNotes[1] ?? 'Use the stable IDs and relationships exposed by the snapshot.',
    focusEntry:
      category === 'Overlay'
        ? 'Focus starts from the consumer trigger; modal patterns move it into the configured scope.'
        : 'The consumer places the composite or its active item in the document tab sequence.',
    focusMovement: keyboardInteractions.map((item) => `${item.keys}: ${item.action}`).join(' '),
    focusExit:
      category === 'Overlay'
        ? 'Escape or an accepted dismissal returns focus only when the component contract requests it.'
        : 'Tab leaves the composite in document order; destroy never moves focus.',
    screenReader: `${summary} State changes must remain perceivable in consumer markup.`,
    consumerResponsibilities: consumerNote,
    limitations:
      'Headless behavior cannot validate consumer content, visual contrast, zoom/reflow, or assistive-technology combinations.',
  },
});

const overlayKeys = [
  keyboard('Enter / Space', 'Open from the trigger.'),
  keyboard('Escape', 'Close the topmost overlay and restore focus.'),
  keyboard('Tab / Shift+Tab', 'Move focus according to the configured focus scope.'),
];
const collectionKeys = [
  keyboard('Arrow keys', 'Move the active item, skipping disabled items.'),
  keyboard('Home / End', 'Move to the first or last enabled item.'),
  keyboard('Type characters', 'Move by normalized typeahead.'),
];
const consumerNote =
  'The consumer owns markup, visible labels, styling, and final content semantics.';

export const componentRegistry: readonly DemoComponentDefinition[] = [
  define(
    'dialog',
    'Dialog',
    'Modal and non-modal focus scopes with nested overlay coordination.',
    'Overlay',
    'WAI-ARIA Dialog (Modal)',
    [
      scenario('modal', 'Modal', 'Focus trap, inert background, scroll lock, and restore focus.'),
      scenario('non-modal', 'Non-modal', 'Dismissible content without inerting or focus trapping.'),
      scenario('nested', 'Nested', 'Only the topmost dialog handles Escape.'),
      scenario(
        'no-tabbable',
        'No tabbable content',
        'The content container becomes the focus fallback.',
      ),
    ],
    overlayKeys,
    [
      'Uses role="dialog" and aria-modal metadata.',
      'A visible title must label the dialog.',
      consumerNote,
    ],
  ),
  define(
    'popover',
    'Popover',
    'Anchored, dismissible content with collision-aware coordinates.',
    'Overlay',
    'Disclosure plus dialog semantics',
    [
      scenario('basic', 'Basic', 'Anchored to a trigger with outside dismissal.'),
      scenario('edge', 'Viewport edge', 'Flip and shift keep content inside the viewport.'),
      scenario('controlled', 'Controlled', 'The consumer owns open state.'),
    ],
    overlayKeys,
    [
      'Trigger and content IDs remain stable.',
      'Nested branches are treated as inside.',
      consumerNote,
    ],
  ),
  define(
    'dropdown-menu',
    'Dropdown Menu',
    'Trigger-driven actions using the shared Menu engine.',
    'Navigation',
    'Menu Button',
    [
      scenario('basic', 'Basic', 'Pointer and keyboard trigger activation.'),
      scenario('disabled', 'Disabled item', 'Navigation skips unavailable actions.'),
      scenario('submenu', 'Submenu', 'ArrowRight requests nested content.'),
    ],
    collectionKeys,
    ['Menu items use role="menuitem".', 'Focus moves into the first enabled item.', consumerNote],
  ),
  define(
    'context-menu',
    'Context Menu',
    'Pointer or Shift+F10 menu with a virtual anchor.',
    'Navigation',
    'Menu',
    [
      scenario('pointer', 'Pointer', 'Open at contextmenu coordinates.'),
      scenario('keyboard', 'Keyboard', 'Open from Shift+F10 or ContextMenu.'),
      scenario('submenu', 'Submenu', 'Nested actions reuse Menu navigation.'),
    ],
    collectionKeys,
    ['The native context menu is prevented only by the active handler.', consumerNote],
  ),
  define(
    'tooltip',
    'Tooltip',
    'Non-interactive description with scope coordination and safe delays.',
    'Overlay',
    'Tooltip',
    [
      scenario('hover', 'Hover', 'Fine-pointer hover opens after a delay.'),
      scenario('focus', 'Focus', 'Keyboard focus opens immediately.'),
      scenario('scope', 'Shared scope', 'Opening one tooltip closes its sibling.'),
    ],
    [
      keyboard('Focus', 'Open and expose aria-describedby.'),
      keyboard('Escape', 'Dismiss the active tooltip.'),
    ],
    [
      'Tooltip content must remain non-interactive.',
      'Touch hover is intentionally ignored.',
      consumerNote,
    ],
  ),
  define(
    'accordion',
    'Accordion',
    'Single or multiple disclosure groups with roving focus.',
    'Disclosure',
    'Accordion',
    [
      scenario('single', 'Single', 'At most one section is expanded.'),
      scenario('multiple', 'Multiple', 'Several sections may remain expanded.'),
      scenario('dynamic', 'Dynamic', 'Registration cleanup preserves valid focus.'),
    ],
    collectionKeys,
    [
      'Heading structure is supplied by the consumer.',
      'Trigger and panel IDs are paired.',
      consumerNote,
    ],
  ),
  define(
    'tabs',
    'Tabs',
    'Manual or automatic tab activation with RTL-aware navigation.',
    'Selection',
    'Tabs',
    [
      scenario('automatic', 'Automatic', 'Selection follows roving focus.'),
      scenario('manual', 'Manual', 'Enter or Space commits selection.'),
      scenario('vertical', 'Vertical', 'Up and Down replace horizontal arrows.'),
    ],
    collectionKeys,
    [
      'Tab and tabpanel relationships are deterministic.',
      'Only the active tab has tabindex=0.',
      consumerNote,
    ],
  ),
  define(
    'disclosure',
    'Disclosure',
    'The shared expanded/collapsed primitive.',
    'Disclosure',
    'Disclosure',
    [
      scenario('uncontrolled', 'Uncontrolled', 'The controller owns expansion.'),
      scenario('controlled', 'Controlled', 'An external store owns expansion.'),
      scenario('disabled', 'Disabled', 'Interaction becomes a no-op.'),
    ],
    [keyboard('Enter / Space', 'Toggle expansion from the trigger.')],
    ['aria-expanded and aria-controls come from the snapshot.', consumerNote],
  ),
  define(
    'toast',
    'Toast',
    'Priority queue, pausable timers, announcements, and promise lifecycle.',
    'Feedback',
    'Status / Alert',
    [
      scenario('queue', 'Priority queue', 'Visible capacity and deterministic ordering.'),
      scenario('promise', 'Promise', 'Loading becomes success or error.'),
      scenario('pause', 'Pause and resume', 'Remaining timeout survives interaction.'),
    ],
    [keyboard('Tab', 'Reach consumer-provided dismiss controls.')],
    [
      'Polite and assertive announcement metadata is explicit.',
      'Do not move focus automatically.',
      consumerNote,
    ],
  ),
  define(
    'command-palette',
    'Command Palette',
    'Modal fuzzy command search with a configurable shortcut.',
    'Navigation',
    'Dialog plus Listbox',
    [
      scenario('search', 'Search', 'Fuzzy score filters commands.'),
      scenario('groups', 'Groups', 'Commands retain group metadata.'),
      scenario('empty', 'Empty', 'No-match state is explicit.'),
    ],
    [keyboard('Control/Command+K', 'Toggle the palette.'), ...collectionKeys],
    ['Uses Dialog focus management and collection semantics.', consumerNote],
  ),
  define(
    'menu',
    'Menu',
    'Reusable item, submenu, disabled-state, and typeahead engine.',
    'Navigation',
    'Menu',
    [
      scenario('actions', 'Actions', 'Cancellable selection lifecycle.'),
      scenario('typeahead', 'Typeahead', 'Normalized text lookup.'),
      scenario('long', 'Long collection', 'Loop behavior is configurable.'),
    ],
    collectionKeys,
    ['Separators never receive focus.', consumerNote],
  ),
  define(
    'listbox',
    'Listbox',
    'Single and multi-selection with active-descendant navigation.',
    'Selection',
    'Listbox',
    [
      scenario('single', 'Single', 'One selected value.'),
      scenario('multiple', 'Multiple', 'Selection toggles independently.'),
      scenario('disabled', 'Disabled', 'Unavailable options are skipped.'),
    ],
    collectionKeys,
    [
      'aria-activedescendant points to the active option.',
      'aria-multiselectable reflects mode.',
      consumerNote,
    ],
  ),
  define(
    'combobox',
    'Combobox',
    'Editable autocomplete with async race protection and IME support.',
    'Selection',
    'Combobox',
    [
      scenario('local', 'Local filtering', 'Fuzzy matching over registered options.'),
      scenario('async', 'Async suggestions', 'Stale responses cannot replace a newer query.'),
      scenario('empty', 'No results', 'Loading and empty state are distinct.'),
    ],
    [
      keyboard('ArrowDown / ArrowUp', 'Navigate suggestions.'),
      keyboard('Enter', 'Commit the active suggestion.'),
      keyboard('Escape', 'Close suggestions.'),
    ],
    [
      'Composition events prevent premature filtering.',
      'Input controls the popup listbox through stable IDs.',
      consumerNote,
    ],
  ),
  define(
    'tree-view',
    'Tree View',
    'Hierarchical expansion, selection, and computed set metadata.',
    'Selection',
    'Tree View',
    [
      scenario('nested', 'Nested hierarchy', 'Visible preorder traversal.'),
      scenario('disabled', 'Disabled node', 'Navigation skips disabled nodes.'),
      scenario('dynamic', 'Dynamic', 'Active-node removal chooses a valid neighbor.'),
    ],
    [
      keyboard('Up / Down', 'Move through visible nodes.'),
      keyboard('Left / Right', 'Collapse, expand, or move parent/child.'),
      keyboard('Home / End', 'Move to tree edges.'),
    ],
    ['Level, set size, and position in set are computed.', consumerNote],
  ),
  define(
    'navigation-menu',
    'Navigation Menu',
    'Simple and mega-menu content with consumer-selected responsive mode.',
    'Navigation',
    'Navigation Menu',
    [
      scenario('desktop', 'Desktop', 'Delayed pointer intent.'),
      scenario('compact', 'Compact', 'Immediate expansion controlled by the consumer.'),
      scenario('mega', 'Mega menu', 'Nested content uses shared positioning.'),
    ],
    collectionKeys,
    ['The runtime never chooses a viewport breakpoint.', consumerNote],
    'experimental',
  ),
  define(
    'collapsible',
    'Collapsible',
    'Intent-oriented alias of the Disclosure primitive.',
    'Disclosure',
    'Disclosure',
    [
      scenario('basic', 'Basic', 'Simple expandable content.'),
      scenario('controlled', 'Controlled', 'External ownership with the same contract.'),
    ],
    [keyboard('Enter / Space', 'Toggle content.')],
    ['Reuses Disclosure without parallel state logic.', consumerNote],
  ),
];

export const getComponent = (id: string): DemoComponentDefinition | undefined =>
  componentRegistry.find((component) => component.id === id);
