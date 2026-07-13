let nextId = 0;

/** Creates an invocation-time relationship ID without reading browser globals. @internal */
export function createRuntimeId(prefix = 'uhr'): string {
  nextId += 1;
  return `${prefix}-${nextId.toString(36)}`;
}
