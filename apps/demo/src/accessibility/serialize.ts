export function serializeForInspector(value: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(
    value,
    (_key, candidate: unknown) => {
      if (candidate instanceof Element) return `[${candidate.tagName.toLocaleLowerCase()}]`;
      if (typeof candidate === 'object' && candidate !== null) {
        if (seen.has(candidate)) return '[Circular]';
        seen.add(candidate);
      }
      if (typeof candidate === 'function') return '[Function]';
      return candidate;
    },
    2,
  );
}
