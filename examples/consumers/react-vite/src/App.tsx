import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  createDialog,
  createTabs,
  type DialogController,
  type DialogSnapshot,
  type TabItem,
  type TabItemSnapshot,
  type TabsChangeReason,
  type TabsController,
  type TabsSnapshot,
} from 'ui-headless-runtime';

interface TabDefinition extends TabItem {
  readonly label: string;
  readonly content: string;
  readonly tabId: string;
  readonly panelId: string;
}

const createTabDefinition = (
  id: string,
  label: string,
  content: string,
  disabled = false,
): TabDefinition => ({
  id,
  text: label,
  label,
  content,
  disabled,
  tabId: `account-tabs-${id}-tab`,
  panelId: `account-tabs-${id}-panel`,
});

const STATIC_TABS: readonly TabDefinition[] = [
  createTabDefinition(
    'overview',
    'Overview',
    'The external React store starts with Overview selected.',
  ),
  createTabDefinition(
    'activity',
    'Activity',
    'Recent activity remains consumer-rendered while the runtime owns navigation metadata.',
  ),
  createTabDefinition(
    'permissions',
    'Permissions',
    'The external authority accepted this protected selection request.',
  ),
  createTabDefinition(
    'archived',
    'Archived',
    'Disabled tabs remain registered for correct ordering and accessibility metadata.',
    true,
  ),
];

const METRICS_TAB = createTabDefinition(
  'metrics',
  'Metrics',
  'Metrics was registered dynamically. Removing it demonstrates registration cleanup.',
);

const findItem = (
  snapshot: Readonly<TabsSnapshot> | null,
  id: string,
): Readonly<TabItemSnapshot> | undefined => snapshot?.items.find((item) => item.id === id);

export default function App() {
  const dialogControllerRef = useRef<DialogController | null>(null);
  const dialogReleaseRef = useRef<() => void>(() => undefined);
  const dialogTriggerRef = useRef<HTMLButtonElement>(null);
  const dialogBackdropRef = useRef<HTMLDivElement>(null);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const dialogCloseRef = useRef<HTMLButtonElement>(null);
  const [dialogController, setDialogController] = useState<DialogController | null>(null);
  const [dialogSnapshot, setDialogSnapshot] = useState<Readonly<DialogSnapshot> | null>(null);

  const tabsControllerRef = useRef<TabsController | null>(null);
  const tabElementsRef = useRef(new Map<string, HTMLButtonElement>());
  const controlledListenersRef = useRef(new Set<() => void>());
  const selectedIdRef = useRef('overview');
  const permissionsAllowedRef = useRef(false);
  const [tabsController, setTabsController] = useState<TabsController | null>(null);
  const [tabsSnapshot, setTabsSnapshot] = useState<Readonly<TabsSnapshot> | null>(null);
  const [selectedId, setSelectedId] = useState('overview');
  const [permissionsAllowed, setPermissionsAllowed] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [policyMessage, setPolicyMessage] = useState(
    'Protected selections are rejected until the external policy is enabled.',
  );
  const [lastRequest, setLastRequest] = useState('No selection request yet.');

  const publishControlledSelection = useCallback((nextId: string) => {
    if (selectedIdRef.current === nextId) return;
    selectedIdRef.current = nextId;
    setSelectedId(nextId);
    for (const listener of controlledListenersRef.current) listener();
  }, []);

  useEffect(() => {
    const controller = createDialog({
      id: 'react-consumer-dialog',
      modal: true,
      initialFocus: () => dialogCloseRef.current,
      restoreFocus: true,
    });
    dialogControllerRef.current = controller;
    setDialogController(controller);
    setDialogSnapshot(controller.getSnapshot());
    const unsubscribe = controller.subscribe(setDialogSnapshot);

    return () => {
      dialogReleaseRef.current();
      dialogReleaseRef.current = () => undefined;
      unsubscribe();
      controller.destroy();
      if (dialogControllerRef.current === controller) dialogControllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const trigger = dialogTriggerRef.current;
    const backdrop = dialogBackdropRef.current;
    const content = dialogContentRef.current;
    if (!dialogController || !trigger || !backdrop || !content) return;

    const release = dialogController.bind({ trigger, backdrop, content });
    dialogReleaseRef.current = release;
    return () => {
      release();
      if (dialogReleaseRef.current === release) dialogReleaseRef.current = () => undefined;
    };
  }, [dialogController]);

  useEffect(() => {
    const controller = createTabs({
      id: 'account-tabs',
      activation: 'manual',
      getValue: () => selectedIdRef.current,
      onValueChange(nextId, details) {
        setLastRequest(`Runtime requested ${nextId} (${details.reason}).`);
        if (nextId === null) {
          setPolicyMessage('Clearing the active tab was rejected by the external React authority.');
          return;
        }
        if (nextId === 'permissions' && !permissionsAllowedRef.current) {
          setPolicyMessage('Permissions was rejected: enable the external policy, then try again.');
          return;
        }
        setPolicyMessage(`${nextId} was accepted by the external React authority.`);
        publishControlledSelection(nextId);
      },
      subscribeValue(listener) {
        controlledListenersRef.current.add(listener);
        return () => controlledListenersRef.current.delete(listener);
      },
    });
    tabsControllerRef.current = controller;
    setTabsController(controller);
    setTabsSnapshot(controller.getSnapshot());
    const unsubscribe = controller.subscribe(setTabsSnapshot);

    return () => {
      unsubscribe();
      controller.destroy();
      controlledListenersRef.current.clear();
      if (tabsControllerRef.current === controller) tabsControllerRef.current = null;
    };
  }, [publishControlledSelection]);

  useEffect(() => {
    if (!tabsController) return;
    const releases = STATIC_TABS.map((item) =>
      tabsController.registerTab(item, tabElementsRef.current.get(item.id)),
    );
    return () => {
      for (const release of [...releases].reverse()) release();
    };
  }, [tabsController]);

  useEffect(() => {
    if (!tabsController || !showMetrics) return;
    return tabsController.registerTab(METRICS_TAB, tabElementsRef.current.get(METRICS_TAB.id));
  }, [showMetrics, tabsController]);

  const visibleTabs = showMetrics ? [...STATIC_TABS, METRICS_TAB] : STATIC_TABS;

  const setTabElement = (id: string, element: HTMLButtonElement | null): void => {
    if (element) tabElementsRef.current.set(id, element);
    else tabElementsRef.current.delete(id);
  };

  const requestTab = (id: string, event: ReactMouseEvent<HTMLButtonElement>): void => {
    tabsControllerRef.current?.select(id, { reason: 'pointer', event: event.nativeEvent });
  };

  const focusTab = (id: string, event: ReactFocusEvent<HTMLButtonElement>): void => {
    tabsControllerRef.current?.focus(id, { reason: 'focus', event: event.nativeEvent });
  };

  const handleTabKeyDown = (id: string, event: ReactKeyboardEvent<HTMLButtonElement>): void => {
    tabsControllerRef.current?.handleKeyDown(id, event.nativeEvent);
  };

  const changePermissionsPolicy = (event: ChangeEvent<HTMLInputElement>): void => {
    const allowed = event.currentTarget.checked;
    permissionsAllowedRef.current = allowed;
    setPermissionsAllowed(allowed);
    setPolicyMessage(
      allowed
        ? 'The external authority will now accept Permissions.'
        : 'The external authority will reject new Permissions requests.',
    );
  };

  const selectFromExternalOwner = (id: string, reason: TabsChangeReason): void => {
    publishControlledSelection(id);
    setLastRequest(`External owner selected ${id} (${reason}); no runtime request was needed.`);
    setPolicyMessage(`${id} was committed directly by the external React authority.`);
  };

  const openDialog = (event: ReactMouseEvent<HTMLButtonElement>): void => {
    dialogControllerRef.current?.open({ reason: 'trigger', event: event.nativeEvent });
  };

  const closeDialog = (event: ReactMouseEvent<HTMLButtonElement>): void => {
    dialogControllerRef.current?.close({ reason: 'trigger', event: event.nativeEvent });
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="eyebrow">Standalone npm consumer</p>
        <h1>React owns the UI. The runtime owns interaction semantics.</h1>
        <p className="lede">
          This application imports controllers directly from <code>ui-headless-runtime</code>. It
          uses no adapter, UI framework, or runtime stylesheet.
        </p>
      </header>

      <main className="workspace">
        <section className="card" aria-labelledby="tabs-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Controlled state + dynamic collection</p>
              <h2 id="tabs-heading">Account workspace</h2>
            </div>
            <span className="state-chip">Owner value: {selectedId}</span>
          </div>

          <div className="controls" aria-label="External Tabs controls">
            <label className="check-control">
              <input
                type="checkbox"
                checked={permissionsAllowed}
                onChange={changePermissionsPolicy}
              />
              Allow protected Permissions selection
            </label>
            <label className="check-control">
              <input
                type="checkbox"
                checked={showMetrics}
                onChange={(event) => setShowMetrics(event.currentTarget.checked)}
              />
              Register optional Metrics tab
            </label>
            <button
              className="secondary-button"
              type="button"
              onClick={() => selectFromExternalOwner('overview', 'programmatic')}
            >
              External owner selects Overview
            </button>
          </div>

          <div
            className="tab-list"
            role="tablist"
            aria-label="Account sections"
            aria-orientation={tabsSnapshot?.orientation ?? 'horizontal'}
          >
            {visibleTabs.map((definition) => {
              const item = findItem(tabsSnapshot, definition.id);
              const tabId = item?.tabId ?? definition.tabId;
              const panelId = item?.panelId ?? definition.panelId;
              const selected = item?.selected ?? selectedId === definition.id;
              return (
                <button
                  key={definition.id}
                  ref={(element) => setTabElement(definition.id, element)}
                  id={tabId}
                  className="tab"
                  type="button"
                  role="tab"
                  aria-controls={panelId}
                  aria-selected={selected}
                  tabIndex={item?.tabIndex ?? (selected ? 0 : -1)}
                  disabled={item?.disabled ?? definition.disabled}
                  onClick={(event) => requestTab(definition.id, event)}
                  onFocus={(event) => focusTab(definition.id, event)}
                  onKeyDown={(event) => handleTabKeyDown(definition.id, event)}
                >
                  {definition.label}
                  {definition.id === 'permissions' && <span className="tab-badge">Policy</span>}
                </button>
              );
            })}
          </div>

          <div className="panels">
            {visibleTabs.map((definition) => {
              const item = findItem(tabsSnapshot, definition.id);
              const selected = item?.selected ?? selectedId === definition.id;
              return (
                <section
                  key={definition.id}
                  id={item?.panelId ?? definition.panelId}
                  className="tab-panel"
                  role="tabpanel"
                  aria-labelledby={item?.tabId ?? definition.tabId}
                  hidden={!selected}
                  tabIndex={0}
                >
                  <h3>{definition.label}</h3>
                  <p>{definition.content}</p>
                </section>
              );
            })}
          </div>

          <div className="status-grid">
            <p role="status" aria-live="polite">
              <strong>Authority:</strong> {policyMessage}
            </p>
            <p>
              <strong>Request log:</strong> {lastRequest}
            </p>
          </div>
          <p className="hint">
            Use Left/Right, Home, or End to move focus. This manual tabset selects with Enter or
            Space. Archived is disabled.
          </p>
        </section>

        <section className="card dialog-demo" aria-labelledby="dialog-demo-heading">
          <div>
            <p className="eyebrow">Bound overlay lifecycle</p>
            <h2 id="dialog-demo-heading">Modal Dialog</h2>
            <p>
              Opening moves focus to the close action. Escape or the shaded outside area closes the
              modal, then focus returns to this trigger.
            </p>
          </div>
          <button
            ref={dialogTriggerRef}
            className="primary-button"
            type="button"
            aria-haspopup="dialog"
            aria-controls={dialogSnapshot?.contentId ?? 'react-consumer-dialog'}
            aria-expanded={dialogSnapshot?.open ?? false}
            disabled={!dialogSnapshot}
            onClick={openDialog}
          >
            Review lifecycle details
          </button>
        </section>
      </main>

      <div
        ref={dialogBackdropRef}
        className="dialog-backdrop"
        aria-hidden="true"
        hidden={!dialogSnapshot?.open}
      />
      <div
        ref={dialogContentRef}
        id={dialogSnapshot?.contentId ?? 'react-consumer-dialog'}
        className="dialog-content"
        role={dialogSnapshot?.role ?? 'dialog'}
        aria-modal={dialogSnapshot?.ariaModal ?? undefined}
        aria-labelledby="runtime-dialog-title"
        aria-describedby="runtime-dialog-description"
        hidden={!dialogSnapshot?.open}
        tabIndex={-1}
      >
        <p className="eyebrow">Runtime-managed interaction</p>
        <h2 id="runtime-dialog-title">A direct Dialog integration</h2>
        <p id="runtime-dialog-description">
          React renders this content. The bound controller supplies modal focus containment, Escape
          handling, outside dismissal, scroll locking, and focus restoration.
        </p>
        <div className="dialog-actions">
          <button
            ref={dialogCloseRef}
            className="primary-button"
            type="button"
            onClick={closeDialog}
          >
            Close and restore focus
          </button>
        </div>
      </div>
    </div>
  );
}
