import { componentRegistry, type ComponentId } from '../registry/components';
import type { DemoEvent, ExampleFactory, ExampleInstance } from './shared/types';

const exampleModules = import.meta.glob<{ default: ExampleFactory }>('./*.ts');
const sourceModules = import.meta.glob<string>('./*.ts', {
  query: '?raw',
  import: 'default',
});

const modulePathFor = (id: ComponentId): string => `./${id}.ts`;

export function assertExampleRegistry(): void {
  const expected = new Set(componentRegistry.map((component) => modulePathFor(component.id)));
  const executable = new Set(Object.keys(exampleModules));
  const sources = new Set(Object.keys(sourceModules));

  for (const path of expected) {
    if (!executable.has(path)) throw new Error(`Missing executable example module: ${path}`);
    if (!sources.has(path)) throw new Error(`Missing source example module: ${path}`);
  }
  for (const path of executable) {
    if (path === './create-example.ts') continue;
    if (!expected.has(path)) throw new Error(`Unregistered executable example module: ${path}`);
  }
}

export async function createExample(
  id: ComponentId,
  scenario: string,
  mount: HTMLElement,
  emit: (event: DemoEvent) => void,
): Promise<ExampleInstance> {
  const path = modulePathFor(id);
  const load = exampleModules[path];
  if (!load) throw new Error(`No example module registered for ${id}`);
  const module = await load();
  return module.default({ scenario, mount, emit });
}

export async function loadExampleSource(id: ComponentId): Promise<string> {
  const path = modulePathFor(id);
  const load = sourceModules[path];
  if (!load) throw new Error(`No example source registered for ${id}`);
  return load();
}

export type { DemoEvent, ExampleInstance } from './shared/types';
