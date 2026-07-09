export interface RouteChange {
  readonly path: string;
}

const normalize = (hash: string): string => {
  const path = hash.replace(/^#\/?/u, '/');
  return path === '/' || path.length === 0 ? '/' : path.replace(/\/+$/u, '');
};

function currentPath(): string {
  return normalize(location.hash);
}

export function startRouter(render: (change: RouteChange) => void): () => void {
  const route = (): void => {
    render({ path: currentPath() });
    window.scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => document.querySelector<HTMLElement>('#main')?.focus());
  };
  window.addEventListener('hashchange', route);
  route();
  return () => window.removeEventListener('hashchange', route);
}
