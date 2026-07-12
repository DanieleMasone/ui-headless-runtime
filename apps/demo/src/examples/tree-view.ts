import { createTreeView, type TreeNode } from 'ui-headless-runtime';
import { adaptController } from './shared/controller-adapter';
import { button, createStage, element } from './shared/dom';
import type { ExampleContext, ExampleInstance } from './shared/types';

export default function createTreeViewExample({
  scenario,
  mount,
  emit,
}: ExampleContext): ExampleInstance {
  const stage = createStage(mount, scenario);
  const controller = createTreeView();
  const tree = element('div');
  tree.className = 'tree';
  tree.setAttribute('role', 'tree');
  tree.setAttribute('aria-label', 'Workspace hierarchy');
  tree.addEventListener('keydown', (event) => controller.handleKeyDown(event));
  stage.append(tree);
  const nodes: TreeNode[] = [
    {
      id: 'workspace',
      text: 'Workspace',
      hasChildren: true,
      loading: scenario === 'dynamic',
    },
    { id: 'design', text: 'Design', parentId: 'workspace' },
    {
      id: 'engineering',
      text: 'Engineering',
      parentId: 'workspace',
      hasChildren: true,
    },
    { id: 'web', text: 'Web platform', parentId: 'engineering' },
    ...(scenario === 'disabled'
      ? [
          {
            id: 'archive',
            text: 'Archive',
            parentId: 'workspace',
            disabled: true,
          },
        ]
      : []),
  ];
  const branchIds = new Set(nodes.filter((node) => node.hasChildren).map((node) => node.id));
  const cleanups = nodes.map((node) => controller.registerNode(node));
  controller.toggle('workspace');
  if (scenario === 'dynamic') {
    stage.append(
      button('Finish loading workspace', () => {
        cleanups.push(
          controller.registerNode({
            id: 'workspace',
            text: 'Workspace',
            hasChildren: true,
            loading: false,
          }),
        );
      }),
    );
  }
  return adaptController(
    controller,
    (snapshot) => {
      const restoreRovingFocus = tree.contains(tree.ownerDocument.activeElement);
      let activeItem: HTMLButtonElement | undefined;
      const items = snapshot.visibleNodes.map((node) => {
        const item = button(`${'· '.repeat(node.level - 1)}${node.id}`, () => {
          controller.setActive(node.id);
          if (branchIds.has(node.id)) {
            controller.toggle(node.id, { reason: 'pointer' });
          }
          controller.select(node.id, { reason: 'pointer' });
        });
        item.setAttribute('role', 'treeitem');
        item.tabIndex = node.tabIndex;
        item.id = node.id;
        item.setAttribute('aria-level', String(node.level));
        item.setAttribute('aria-setsize', String(node.setSize));
        item.setAttribute('aria-posinset', String(node.positionInSet));
        item.setAttribute('aria-selected', String(node.selected));
        item.setAttribute('aria-disabled', String(node.disabled));
        item.setAttribute('aria-busy', String(node.loading));
        if (branchIds.has(node.id)) {
          item.setAttribute('aria-expanded', String(node.expanded));
        }
        item.disabled = node.disabled;
        if (node.id === snapshot.activeId) activeItem = item;
        return item;
      });
      tree.replaceChildren(...items);
      tree.setAttribute('aria-multiselectable', String(snapshot.ariaMultiselectable));
      if (restoreRovingFocus) activeItem?.focus();
    },
    emit,
    () => cleanups.forEach((cleanup) => cleanup()),
  );
}
