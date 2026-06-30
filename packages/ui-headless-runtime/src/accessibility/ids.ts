let nextId = 0;

/** Creates an SSR-safe deterministic relationship ID without reading browser globals. @public */
export function createRuntimeId(prefix = 'uhr'): string {
  nextId += 1;
  return `${prefix}-${nextId.toString(36)}`;
}
