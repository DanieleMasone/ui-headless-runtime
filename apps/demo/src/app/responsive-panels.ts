const panelNames = ['example', 'state', 'events', 'source', 'a11y'] as const;

type PanelName = (typeof panelNames)[number];

interface PanelRecord {
  readonly name: PanelName;
  readonly tab: HTMLButtonElement;
  readonly panel: HTMLElement;
  readonly desktopRole: string | null;
  readonly desktopLabelledBy: string | null;
}

const mobileQuery = '(max-width: 36rem)';

/** Binds the mobile component-laboratory tabs and restores the desktop multi-panel layout. */
export function bindResponsivePanels(root: ParentNode): () => void {
  const tablist = root.querySelector<HTMLElement>('.lab-panel-switcher');
  if (!tablist) throw new Error('The laboratory panel switcher is missing.');

  const records: readonly PanelRecord[] = panelNames.map((name) => {
    const tab = tablist.querySelector<HTMLButtonElement>(`[data-panel-target="${name}"]`);
    const panel = root.querySelector<HTMLElement>(`[data-panel="${name}"]`);
    if (!tab || !panel) throw new Error(`The ${name} laboratory panel is missing.`);
    return {
      name,
      tab,
      panel,
      desktopRole: panel.getAttribute('role'),
      desktopLabelledBy: panel.getAttribute('aria-labelledby'),
    };
  });
  const media = window.matchMedia(mobileQuery);
  let activeName: PanelName = 'example';

  const render = (): void => {
    const mobile = media.matches;
    tablist.hidden = !mobile;
    for (const record of records) {
      const active = record.name === activeName;
      record.tab.tabIndex = active ? 0 : -1;
      record.tab.setAttribute('aria-selected', String(active));
      record.panel.hidden = mobile && !active;
      if (mobile) {
        record.panel.setAttribute('role', 'tabpanel');
        record.panel.setAttribute('aria-labelledby', record.tab.id);
      } else {
        if (record.desktopRole === null) record.panel.removeAttribute('role');
        else record.panel.setAttribute('role', record.desktopRole);
        if (record.desktopLabelledBy === null) record.panel.removeAttribute('aria-labelledby');
        else record.panel.setAttribute('aria-labelledby', record.desktopLabelledBy);
      }
    }
  };

  const activate = (name: PanelName, moveFocus: boolean): void => {
    activeName = name;
    render();
    if (moveFocus) records.find((record) => record.name === name)?.tab.focus();
  };

  const cleanups = records.map((record, index) => {
    const handleClick = (): void => activate(record.name, false);
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!media.matches) return;
      let nextIndex: number | undefined;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % records.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + records.length) % records.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = records.length - 1;
      if (nextIndex === undefined) return;
      event.preventDefault();
      const next = records.at(nextIndex);
      if (next) activate(next.name, true);
    };
    record.tab.addEventListener('click', handleClick);
    record.tab.addEventListener('keydown', handleKeyDown);
    return () => {
      record.tab.removeEventListener('click', handleClick);
      record.tab.removeEventListener('keydown', handleKeyDown);
    };
  });
  const handleMediaChange = (): void => render();
  media.addEventListener('change', handleMediaChange);
  render();

  return () => {
    media.removeEventListener('change', handleMediaChange);
    cleanups.forEach((cleanup) => cleanup());
  };
}
