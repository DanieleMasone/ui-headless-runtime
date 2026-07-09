import { createMenuFamilyExample } from './shared/menu-family';
import type { ExampleContext, ExampleInstance } from './shared/types';

export default function createContextMenuExample(context: ExampleContext): ExampleInstance {
  return createMenuFamilyExample(context, 'context-menu');
}
