import {
  Component,
  DestroyRef,
  ElementRef,
  ViewChildren,
  computed,
  inject,
  signal,
} from '@angular/core';
import type { AfterViewInit, QueryList } from '@angular/core';
import {
  createAccordion,
  createTreeView,
  type AccordionItemSnapshot,
  type AccordionSnapshot,
  type TreeNode,
  type TreeNodeSnapshot,
  type TreeSnapshot,
} from 'ui-headless-runtime';

interface AccordionExampleItem {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly disabled: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <header class="hero">
      <p class="eyebrow">Standalone Angular consumer</p>
      <h1>Framework-owned markup, runtime-owned behavior</h1>
      <p>
        Angular Signals render immutable controller snapshots while Angular keeps full ownership of
        templates, DOM references, and lifecycle cleanup.
      </p>
    </header>

    <main>
      <section class="card" aria-labelledby="accordion-heading">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Collection and disclosure</p>
            <h2 id="accordion-heading">Accordion</h2>
          </div>
          <output aria-live="polite">
            Open: {{ accordionSnapshot().expandedIds.join(', ') || 'none' }}
          </output>
        </div>

        <div class="accordion">
          @for (item of accordionItems; track item.id) {
            @let state = accordionItemState(item.id);
            <h3>
              <button
                #accordionTrigger
                type="button"
                [attr.data-item-id]="item.id"
                [attr.id]="state?.triggerId ?? null"
                [attr.aria-controls]="state?.panelId ?? null"
                [attr.aria-expanded]="state?.expanded ?? false"
                [disabled]="state?.disabled ?? item.disabled"
                [tabIndex]="state?.tabIndex ?? -1"
                (click)="toggleAccordion(item.id, $event)"
                (keydown)="handleAccordionKeyDown(item.id, $event)"
              >
                <span>{{ item.title }}</span>
                <span aria-hidden="true">{{ state?.expanded ? '-' : '+' }}</span>
              </button>
            </h3>
            <div
              class="accordion-panel"
              role="region"
              [attr.id]="state?.panelId ?? null"
              [attr.aria-labelledby]="state?.triggerId ?? null"
              [hidden]="state?.expanded !== true"
            >
              <p>{{ item.content }}</p>
            </div>
          }
        </div>
        <p class="hint">Use Up, Down, Home, End, Enter, or Space on an enabled trigger.</p>
      </section>

      <section class="card" aria-labelledby="tree-heading">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Dynamic hierarchical collection</p>
            <h2 id="tree-heading">Tree View</h2>
          </div>
          <output aria-live="polite">
            Selected: {{ treeSnapshot().selectedIds.join(', ') || 'none' }}
          </output>
        </div>

        <button class="secondary-action" type="button" (click)="updateDynamicChild()">
          {{ dynamicActionLabel() }}
        </button>
        <p class="status" aria-live="polite">{{ dynamicStatus() }}</p>

        <div
          class="tree"
          role="tree"
          aria-label="Engineering workspace"
          [attr.aria-multiselectable]="treeSnapshot().ariaMultiselectable"
          (keydown)="handleTreeKeyDown($event)"
        >
          @for (node of treeSnapshot().visibleNodes; track node.id) {
            <button
              #treeItem
              type="button"
              role="treeitem"
              [attr.data-node-id]="node.id"
              [id]="node.id"
              [attr.aria-level]="node.level"
              [attr.aria-setsize]="node.setSize"
              [attr.aria-posinset]="node.positionInSet"
              [attr.aria-expanded]="isTreeBranch(node.id) ? node.expanded : null"
              [attr.aria-selected]="node.selected"
              [attr.aria-disabled]="node.disabled"
              [attr.aria-busy]="node.loading ? 'true' : null"
              [disabled]="node.disabled"
              [tabIndex]="node.tabIndex"
              (click)="activateTreeNode(node, $event)"
            >
              <span class="branch-marker" aria-hidden="true">
                {{ treeMarker(node) }}
              </span>
              <span>{{ treeNodeLabel(node.id) }}</span>
              @if (node.loading) {
                <span class="loading-label">Loading children...</span>
              }
            </button>
          }
        </div>
        <p class="hint">
          Use Arrow keys, Home, End, typeahead, Enter, or Space. The API node is intentionally
          disabled.
        </p>
      </section>
    </main>

    <footer>
      This app imports only the public <code>ui-headless-runtime</code> package entry point and does
      not use a framework adapter.
    </footer>
  `,
})
export class AppComponent implements AfterViewInit {
  @ViewChildren('accordionTrigger', { read: ElementRef })
  private accordionTriggers!: QueryList<ElementRef<HTMLButtonElement>>;

  @ViewChildren('treeItem', { read: ElementRef })
  private treeItems!: QueryList<ElementRef<HTMLButtonElement>>;

  readonly accordionItems: readonly AccordionExampleItem[] = [
    {
      id: 'overview',
      title: 'Overview',
      content: 'The public controller owns expansion state and relationship IDs.',
      disabled: false,
    },
    {
      id: 'keyboard',
      title: 'Keyboard support',
      content: 'Angular forwards native keyboard events to the shared collection engine.',
      disabled: false,
    },
    {
      id: 'archived',
      title: 'Archived section',
      content: 'Disabled triggers stay registered but are skipped by focus navigation.',
      disabled: true,
    },
  ];

  private readonly destroyRef = inject(DestroyRef);
  private readonly accordionController = createAccordion({
    id: 'angular-consumer-accordion',
    type: 'multiple',
    collapsible: true,
    defaultValue: ['overview'],
  });
  private readonly treeController = createTreeView({
    multiple: true,
    defaultExpandedIds: ['workspace', 'engineering'],
    defaultSelectedIds: ['design'],
  });
  readonly accordionSnapshot = signal<Readonly<AccordionSnapshot>>(
    this.accordionController.getSnapshot(),
  );
  readonly treeSnapshot = signal<Readonly<TreeSnapshot>>(this.treeController.getSnapshot());
  readonly treeLoading = signal(true);
  readonly dynamicChildPresent = signal(false);
  readonly dynamicActionLabel = computed(() => {
    if (this.treeLoading()) return 'Complete async child load';
    return this.dynamicChildPresent() ? 'Remove Security child' : 'Add Security child';
  });
  readonly dynamicStatus = computed(() => {
    if (this.treeLoading()) return 'Engineering is waiting for one asynchronous child.';
    return this.dynamicChildPresent()
      ? 'The Security child is registered.'
      : 'The Security child is not registered.';
  });

  private readonly accordionRegistrations = new Map<string, () => void>();
  private readonly treeRegistrations = new Map<string, () => void>();
  private readonly treeNodes = new Map<string, TreeNode>([
    ['workspace', { id: 'workspace', text: 'Workspace', hasChildren: true }],
    ['design', { id: 'design', text: 'Design system', parentId: 'workspace' }],
    [
      'engineering',
      {
        id: 'engineering',
        text: 'Engineering',
        parentId: 'workspace',
        hasChildren: true,
        loading: true,
      },
    ],
    ['web', { id: 'web', text: 'Web platform', parentId: 'engineering' }],
    [
      'api',
      {
        id: 'api',
        text: 'API (disabled)',
        parentId: 'engineering',
        disabled: true,
      },
    ],
    ['security', { id: 'security', text: 'Security', parentId: 'engineering' }],
  ]);

  constructor() {
    const stopAccordion = this.accordionController.subscribe((snapshot) => {
      this.accordionSnapshot.set(snapshot);
    });
    const stopTree = this.treeController.subscribe((snapshot) => {
      this.treeSnapshot.set(snapshot);
    });

    for (const item of this.accordionItems) this.registerAccordionItem(item);
    for (const id of ['workspace', 'design', 'engineering', 'web', 'api']) {
      const node = this.treeNodes.get(id);
      if (node) this.replaceTreeNode(node);
    }

    this.destroyRef.onDestroy(() => {
      stopAccordion();
      stopTree();
      for (const release of this.accordionRegistrations.values()) release();
      for (const release of this.treeRegistrations.values()) release();
      this.accordionRegistrations.clear();
      this.treeRegistrations.clear();
      this.accordionController.destroy();
      this.treeController.destroy();
    });
  }

  ngAfterViewInit(): void {
    for (const reference of this.accordionTriggers) {
      const itemId = reference.nativeElement.dataset['itemId'];
      const item = this.accordionItems.find((candidate) => candidate.id === itemId);
      if (item) this.registerAccordionItem(item, reference.nativeElement);
    }
  }

  accordionItemState(id: string): Readonly<AccordionItemSnapshot> | undefined {
    return this.accordionSnapshot().items.find((item) => item.id === id);
  }

  toggleAccordion(id: string, event: MouseEvent): void {
    this.accordionController.toggle(id, { reason: 'trigger', event });
  }

  handleAccordionKeyDown(id: string, event: KeyboardEvent): void {
    this.accordionController.handleTriggerKeyDown(id, event);
  }

  activateTreeNode(node: Readonly<TreeNodeSnapshot>, event: MouseEvent): void {
    if (node.disabled) return;
    this.treeController.setActive(node.id);
    if (this.isTreeBranch(node.id)) {
      this.treeController.toggle(node.id, { reason: 'pointer', event });
    }
    this.treeController.select(node.id, { reason: 'pointer', event });
  }

  handleTreeKeyDown(event: KeyboardEvent): void {
    this.treeController.handleKeyDown(event);
    const activeId = this.treeController.getSnapshot().activeId;
    if (!activeId) return;
    this.treeItems
      .find((reference) => reference.nativeElement.dataset['nodeId'] === activeId)
      ?.nativeElement.focus();
  }

  updateDynamicChild(): void {
    if (this.treeLoading()) {
      const engineering = this.treeNodes.get('engineering');
      if (engineering) this.replaceTreeNode({ ...engineering, loading: false });
      this.registerDynamicChild();
      this.treeLoading.set(false);
      return;
    }

    if (this.dynamicChildPresent()) {
      this.treeRegistrations.get('security')?.();
      this.treeRegistrations.delete('security');
      this.dynamicChildPresent.set(false);
      return;
    }

    this.registerDynamicChild();
  }

  isTreeBranch(id: string): boolean {
    return this.treeNodes.get(id)?.hasChildren === true;
  }

  treeMarker(node: Readonly<TreeNodeSnapshot>): string {
    if (!this.isTreeBranch(node.id)) return '*';
    return node.expanded ? '-' : '+';
  }

  treeNodeLabel(id: string): string {
    return this.treeNodes.get(id)?.text ?? id;
  }

  private registerAccordionItem(item: AccordionExampleItem, trigger?: HTMLButtonElement): void {
    const previous = this.accordionRegistrations.get(item.id);
    const metadata = { id: item.id, text: item.title, disabled: item.disabled };
    const release = trigger
      ? this.accordionController.registerItem(metadata, trigger)
      : this.accordionController.registerItem(metadata);
    previous?.();
    this.accordionRegistrations.set(item.id, release);
  }

  private replaceTreeNode(node: TreeNode): void {
    const previous = this.treeRegistrations.get(node.id);
    const release = this.treeController.registerNode(node);
    previous?.();
    this.treeRegistrations.set(node.id, release);
  }

  private registerDynamicChild(): void {
    const node = this.treeNodes.get('security');
    if (!node) return;
    this.replaceTreeNode(node);
    this.dynamicChildPresent.set(true);
  }
}
