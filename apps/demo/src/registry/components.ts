import {
  componentCatalog,
  type ComponentCatalogEntry,
  type ComponentId,
} from '../../../../metadata/components';

export type { ComponentId };

export interface DemoComponentDefinition extends ComponentCatalogEntry {
  readonly accessibilityNotes: readonly string[];
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

const consumerNote =
  'The consumer owns markup, visible labels, styling, and final content semantics.';

const accessibilityNotes = {
  dialog: [
    'Uses role="dialog" and aria-modal metadata.',
    'A visible title must label the dialog.',
    consumerNote,
  ],
  popover: ['Trigger and content IDs remain stable.', 'Nested branches are treated as inside.'],
  'dropdown-menu': ['Menu items use role="menuitem".', 'Focus moves into the first enabled item.'],
  'context-menu': ['The native context menu is prevented only by the active handler.'],
  tooltip: [
    'Tooltip content must remain non-interactive.',
    'Touch hover is intentionally ignored.',
  ],
  accordion: [
    'Heading structure is supplied by the consumer.',
    'Trigger and panel IDs are paired.',
  ],
  tabs: [
    'Tab and tabpanel relationships are deterministic.',
    'Only the active tab has tabindex=0.',
  ],
  disclosure: ['aria-expanded and aria-controls come from the snapshot.'],
  toast: [
    'Polite and assertive announcement metadata is explicit.',
    'Do not move focus automatically.',
  ],
  'command-palette': ['Uses Dialog focus management and collection semantics.'],
  menu: ['Separators never receive focus.'],
  listbox: [
    'aria-activedescendant points to the active option.',
    'aria-multiselectable reflects mode.',
  ],
  combobox: [
    'Composition events prevent premature filtering.',
    'Input controls the popup listbox through stable IDs.',
  ],
  'tree-view': ['Level, set size, and position in set are computed.'],
  'navigation-menu': ['The runtime never chooses a viewport breakpoint.'],
  collapsible: ['Reuses Disclosure without parallel state logic.'],
} satisfies Record<ComponentId, readonly string[]>;

const toDemoDefinition = (entry: ComponentCatalogEntry): DemoComponentDefinition => {
  const notes = [...accessibilityNotes[entry.id], consumerNote];
  return {
    ...entry,
    accessibilityNotes: notes,
    accessibility: {
      roles: entry.pattern,
      accessibleName: 'The consumer supplies a visible label or explicit accessible name.',
      ariaState: notes[0] ?? 'Apply state from the immutable controller snapshot.',
      relationships: notes[1] ?? 'Use the stable IDs and relationships exposed by the snapshot.',
      focusEntry:
        entry.category === 'Overlay'
          ? 'Focus starts from the consumer trigger; modal patterns move it into the configured scope.'
          : 'The consumer places the composite or its active item in the document tab sequence.',
      focusMovement: entry.keyboardInteractions
        .map((item) => `${item.keys}: ${item.action}`)
        .join(' '),
      focusExit:
        entry.category === 'Overlay'
          ? 'Escape or an accepted dismissal returns focus only when the component contract requests it.'
          : 'Tab leaves the composite in document order; destroy never moves focus.',
      screenReader: `${entry.summary} State changes must remain perceivable in consumer markup.`,
      consumerResponsibilities: consumerNote,
      limitations:
        'Headless behavior cannot validate consumer content, visual contrast, zoom/reflow, or assistive-technology combinations.',
    },
  };
};

export const componentRegistry: readonly DemoComponentDefinition[] =
  componentCatalog.map(toDemoDefinition);

export const getComponent = (id: string): DemoComponentDefinition | undefined =>
  componentRegistry.find((component) => component.id === id);
