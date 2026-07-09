import { createTreeView } from 'ui-headless-runtime';
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
  tree.tabIndex = 0;
  tree.setAttribute('role', 'tree');
  tree.setAttribute('aria-label', 'Workspace hierarchy');
  tree.addEventListener('keydown', (event) => controller.handleKeyDown(event));
  stage.append(tree);
  const cleanups = [
    controller.registerNode({
      id: 'workspace',
      text: 'Workspace',
      hasChildren: true,
      loading: scenario === 'dynamic',
    }),
    controller.registerNode({ id: 'design', text: 'Design', parentId: 'workspace' }),
    controller.registerNode({
      id: 'engineering',
      text: 'Engineering',
      parentId: 'workspace',
      hasChildren: true,
    }),
    controller.registerNode({ id: 'web', text: 'Web platform', parentId: 'engineering' }),
    ...(scenario === 'disabled'
      ? [
          controller.registerNode({
            id: 'archive',
            text: 'Archive',
            parentId: 'workspace',
            disabled: true,
          }),
        ]
      : []),
  ];
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
      tree.replaceChildren(
        ...snapshot.visibleNodes.map((node) => {
          const item = button(`${'· '.repeat(node.level - 1)}${node.id}`, () =>
            node.expanded ? controller.select(node.id) : controller.toggle(node.id),
          );
          item.setAttribute('role', 'treeitem');
          item.tabIndex = -1;
          item.id = node.id;
          item.setAttribute('aria-level', String(node.level));
          item.setAttribute('aria-setsize', String(node.setSize));
          item.setAttribute('aria-posinset', String(node.positionInSet));
          item.setAttribute('aria-selected', String(node.selected));
          item.setAttribute('aria-disabled', String(node.disabled));
          item.setAttribute('aria-busy', String(node.loading));
          item.disabled = node.disabled;
          return item;
        }),
      );
    },
    emit,
    () => cleanups.forEach((cleanup) => cleanup()),
  );
}
