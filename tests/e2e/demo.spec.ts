import { expect, test, type Page } from '@playwright/test';
import { componentCatalog } from '../../metadata/components';

const frameworkGuides = [
  { id: 'react', title: 'React integration' },
  { id: 'vue', title: 'Vue integration' },
  { id: 'angular', title: 'Angular integration' },
] as const;

const visit = async (page: Page, path = '/') => {
  await page.goto(`./#${path}`);
};

const inspectResponsiveLayout = async (page: Page) =>
  page.evaluate(() => {
    const isVisible = (element: HTMLElement): boolean => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const label = (element: HTMLElement, index: number): string =>
      element.getAttribute('aria-label') ??
      element.textContent?.trim().slice(0, 40) ??
      `${element.tagName.toLowerCase()}-${index}`;
    const withinViewport = (element: HTMLElement): boolean => {
      const rect = element.getBoundingClientRect();
      return rect.left >= -1 && rect.right <= window.innerWidth + 1;
    };
    const hasHorizontalScrollContainer = (element: HTMLElement): boolean => {
      let current: HTMLElement | null = element;
      while (current && current !== document.body) {
        const style = getComputedStyle(current);
        if (current.scrollWidth > current.clientWidth + 1 && /auto|scroll/u.test(style.overflowX)) {
          return true;
        }
        current = current.parentElement;
      }
      return false;
    };
    const controls = [
      ...document.querySelectorAll<HTMLElement>(
        '.topbar button, .topbar select, .lab-toolbar a, .lab-toolbar select, [role="tablist"] [role="tab"]',
      ),
    ].filter(isVisible);
    const richContent = [...document.querySelectorAll<HTMLElement>('pre, table')].filter(isVisible);
    const topbar = document.querySelector<HTMLElement>('.topbar')?.getBoundingClientRect();
    const main = document.querySelector<HTMLElement>('main')?.getBoundingClientRect();
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      topbarBottom: topbar?.bottom ?? 0,
      mainTop: main?.top ?? -1,
      clippedControls: controls
        .map((element, index) => ({ element, index }))
        .filter(({ element }) => !withinViewport(element))
        .map(({ element, index }) => label(element, index)),
      clippedRichContent: richContent
        .map((element, index) => ({ element, index }))
        .filter(({ element }) => !withinViewport(element) && !hasHorizontalScrollContainer(element))
        .map(({ element, index }) => label(element, index)),
      trappedOverflow: richContent
        .map((element, index) => ({ element, index }))
        .filter(
          ({ element }) =>
            element.scrollWidth > element.clientWidth + 1 && !hasHorizontalScrollContainer(element),
        )
        .map(({ element, index }) => label(element, index)),
    };
  });

const selectScenario = async (page: Page, scenario: string) => {
  await page.getByLabel('Scenario').selectOption(scenario);
  await expect(page.locator('.lab-status')).toContainText('Scenario changed');
};

const interact = async (page: Page, id: string) => {
  const live = page.locator('.example-mount');
  if (id === 'tooltip') {
    await live.getByRole('button', { name: 'Inspect deployment status' }).hover();
    await expect(live.getByRole('tooltip')).toBeVisible();
  } else if (id === 'combobox') {
    await live.getByRole('combobox', { name: 'Assign owner' }).fill('Ada');
  } else if (id === 'tabs') {
    await live.getByRole('tab', { name: 'Members' }).click();
  } else if (id === 'context-menu') {
    await live.getByRole('button', { name: 'Right-click project' }).click({ button: 'right' });
  } else if (id === 'listbox') {
    await live.getByRole('option', { name: 'Rome' }).click();
  } else if (id === 'tree-view') {
    await live.getByRole('treeitem', { name: 'workspace' }).click();
  } else {
    const buttons = live.getByRole('button');
    const count = await buttons.count();
    if (count > 0) await buttons.nth(0).click();
  }
};

test('home, links, theme, search, history, and direct routes work', async ({ page }) => {
  await visit(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Behavior infrastructure');
  await expect(page.getByRole('link', { name: 'Explore components' })).toBeVisible();
  await expect(page.locator('.metric-grid')).toContainText('16');

  const theme = page.getByLabel('Theme');
  await theme.selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('button', { name: 'Search documentation' }).click();
  const search = page.getByRole('combobox', { name: 'Search pages' });
  await search.fill('Combobox');
  await page.getByRole('option', { name: 'Components — Combobox' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Combobox' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Behavior infrastructure');
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1, name: 'Combobox' })).toBeVisible();

  await page.getByRole('button', { name: 'Search documentation' }).click();
  await page.getByRole('combobox', { name: 'Search pages' }).fill('User Guide');
  await page.getByRole('option', { name: /Guides.*User Guide/u }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'User Guide' })).toBeVisible();

  await visit(page, '/components/dialog');
  await expect(page.getByRole('heading', { level: 1, name: 'Dialog' })).toBeVisible();
  await expect(page.locator('#sidebar').getByRole('link', { name: 'Dialog' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page).toHaveTitle('Dialog · UI Headless Runtime');

  await visit(page, '/missing-page');
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
});

test('command search supports its keyboard, relationship, empty, selection, and restore contracts', async ({
  page,
}) => {
  await visit(page);
  const trigger = page.locator('.search-trigger');
  const primaryModifier = await page.evaluate(() =>
    /mac/iu.test(navigator.platform) ? 'Meta' : 'Control',
  );
  await page.keyboard.press(`${primaryModifier}+K`);

  const dialog = page.getByRole('dialog', { name: 'Documentation search' });
  const input = page.getByLabel('Search pages');
  const results = page.getByRole('listbox', { name: 'Search results' });
  await expect(dialog).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(input).toBeFocused();
  await expect(results).toBeVisible();
  const resultsId = await results.getAttribute('id');
  expect(resultsId).toBeTruthy();
  await expect(input).toHaveAttribute('aria-controls', resultsId ?? 'missing-results-id');

  for (const title of ['Framework integration', ...frameworkGuides.map((guide) => guide.title)]) {
    await input.fill(title);
    await expect(
      results.getByRole('option', { name: new RegExp(`Guides.*${title}`, 'u') }),
    ).toBeVisible();
  }
  await input.fill('');

  const initiallySelected = results.locator('[role="option"][aria-selected="true"]');
  await expect(initiallySelected).toHaveCount(1);
  await expect(initiallySelected).toHaveAttribute('tabindex', '-1');
  const initialId = await initiallySelected.getAttribute('id');
  expect(initialId).toBeTruthy();
  await expect(input).toHaveAttribute('aria-activedescendant', initialId ?? 'missing-option-id');

  await page.keyboard.press('ArrowDown');
  await expect
    .poll(async () => results.locator('[role="option"][aria-selected="true"]').getAttribute('id'))
    .not.toBe(initialId);

  await input.fill('No page can match this phrase');
  await expect(page.getByText('No matching page.', { exact: true })).toBeVisible();
  await expect(results.getByRole('option')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();

  await trigger.click();
  await input.fill('Combobox');
  const comboboxResult = results.getByRole('option', { name: 'Components — Combobox' });
  await expect(comboboxResult).toBeVisible();
  const comboboxResultId = await comboboxResult.getAttribute('id');
  expect(comboboxResultId).toBeTruthy();
  await expect(input).toHaveAttribute(
    'aria-activedescendant',
    comboboxResultId ?? 'missing-combobox-option-id',
  );
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Combobox' })).toBeVisible();
});

for (const component of componentCatalog) {
  test(`${component.name} laboratory uses the live controller`, async ({ page }) => {
    await visit(page, component.route);
    await expect(page.getByRole('heading', { level: 1, name: component.name })).toBeVisible();
    await expect(page.locator('.lab-status')).toContainText('Scenario changed');
    await expect(page.locator('.state-output')).toContainText('{');
    await interact(page, component.id);
    await expect(page.locator('.event-output')).toContainText('stateChange');
    await expect(
      page.locator('#main').getByRole('link', { name: 'API reference' }),
    ).toHaveAttribute('href', /api\//u);
    await expect(
      page.locator('#main').getByRole('link', { name: 'Component docs' }),
    ).toHaveAttribute('href', new RegExp(`docs/components/${component.id}\\.html`, 'u'));
    await expect(page.locator('#main').getByRole('link', { name: 'User Guide' })).toHaveAttribute(
      'href',
      /docs\/guide\/controllers\.html/u,
    );
    await expect(page.getByRole('heading', { name: 'Executed source' })).toBeVisible();
  });
}

test('scenario selection, source copy, API and coverage links are wired', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.resolve() },
    });
  });
  await visit(page, '/components/dialog');
  await selectScenario(page, 'nested');
  await expect(page.locator('.scenario-description')).toContainText('topmost');
  const sourcePanel = page.locator('.lab-source code');
  await expect(sourcePanel).toContainText('createDialog');
  const dialogSource = await sourcePanel.textContent();
  await page.getByRole('button', { name: 'Copy' }).click();
  await expect(page.locator('.copy-status')).toHaveText('Source copied.');
  await expect(page.locator('.copy-status')).not.toHaveAttribute('role');
  await expect(page.locator('.lab-status')).toHaveText('Source copied.');
  await expect(page.locator('#main').getByRole('link', { name: 'API reference' })).toHaveAttribute(
    'href',
    /ui-headless-runtime\/api\//u,
  );

  const coverage = page.locator('.sidebar a[href$="coverage/"]');
  await expect(coverage).toHaveAttribute('href', /ui-headless-runtime\/coverage\//u);

  await visit(page, '/components/combobox');
  await expect(sourcePanel).toContainText('createCombobox');
  const comboboxSource = await sourcePanel.textContent();
  expect(dialogSource).toContain('createDialog');
  expect(comboboxSource).toContain('createCombobox');
  expect(comboboxSource).not.toEqual(dialogSource);
});

test('high-risk scenarios exercise nested overlays, async data, queues, trees, and compact navigation', async ({
  page,
}) => {
  await visit(page, '/components/dialog');
  await selectScenario(page, 'nested');
  await page.getByRole('button', { name: 'Open dialog' }).click();
  const parent = page.getByRole('dialog', { name: 'Account confirmation' });
  await page.getByRole('button', { name: 'Open nested dialog' }).click();
  const nested = page.getByRole('dialog', { name: 'Nested confirmation' });
  await expect(nested).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nested).toBeHidden();
  await expect(parent).toBeVisible();

  await visit(page, '/components/combobox');
  await selectScenario(page, 'async');
  const combobox = page.getByRole('combobox', { name: 'Assign owner' });
  await combobox.fill('A');
  await combobox.fill('Ada');
  await expect(page.getByRole('option', { name: 'Ada (remote)', exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: 'A (remote)', exact: true })).toHaveCount(0);

  await visit(page, '/components/toast');
  await selectScenario(page, 'promise');
  await page.getByRole('button', { name: 'Track deployment promise' }).click();
  await expect(page.getByText('Deployed to production', { exact: true })).toBeVisible();

  await visit(page, '/components/tree-view');
  await selectScenario(page, 'dynamic');
  await expect(page.getByRole('treeitem', { name: 'workspace' })).toHaveAttribute(
    'aria-busy',
    'true',
  );
  await page.getByRole('button', { name: 'Finish loading workspace' }).click();
  await expect(page.getByRole('treeitem', { name: 'workspace' })).toHaveAttribute(
    'aria-busy',
    'false',
  );

  await visit(page, '/components/navigation-menu');
  await selectScenario(page, 'compact');
  const products = page.getByRole('button', { name: 'Products' });
  await products.click();
  await expect(products).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByLabel('Navigation content')).toBeVisible();
});

test('article registry and accessibility contract render from centralized metadata', async ({
  page,
}) => {
  await visit(page, '/architecture/cleanup');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Cleanup and ownership' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Generated documentation' })).toHaveAttribute(
    'href',
    /docs\/architecture\/cleanup-and-ownership\.html/u,
  );

  await visit(page, '/components/combobox');
  await expect(page.getByRole('heading', { name: 'Accessibility contract' })).toBeVisible();
  await expect(page.locator('.accessibility-panel')).toContainText('Consumer responsibilities');
  await expect(page.locator('.accessibility-panel')).toContainText('Focus movement');
});

test('mobile navigation isolates the page and supports every dismissal path', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await visit(page);
  const menu = page.locator('.mobile-menu');
  const sidebar = page.locator('#sidebar');
  const backdrop = page.locator('.nav-backdrop');
  const shellSiblings = [page.locator('.topbar'), page.locator('#main'), page.locator('footer')];
  const openNavigation = async (): Promise<void> => {
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(sidebar).toHaveAttribute('role', 'dialog');
    await expect(sidebar).toHaveAttribute('aria-label', 'Site navigation');
    await expect
      .poll(() => page.locator('html').evaluate((root) => root.style.overflow))
      .toBe('hidden');
  };
  const expectNavigationClosed = async (): Promise<void> => {
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('body')).toHaveAttribute('data-nav-open', 'false');
    await expect.poll(() => page.locator('html').evaluate((root) => root.style.overflow)).toBe('');
    await expect(menu).toBeFocused();
    for (const sibling of shellSiblings) {
      await expect(sibling).not.toHaveAttribute('inert', '');
      await expect(sibling).not.toHaveAttribute('aria-hidden', 'true');
    }
  };

  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toHaveAttribute('aria-controls', 'sidebar');
  await openNavigation();
  await expect(page.locator('body')).toHaveAttribute('data-nav-open', 'true');
  const close = page.getByRole('button', { name: 'Close navigation' });
  await expect(close).toBeFocused();
  for (const sibling of shellSiblings) {
    await expect(sibling).toHaveAttribute('inert', '');
    await expect(sibling).toHaveAttribute('aria-hidden', 'true');
  }
  await page.keyboard.press('Shift+Tab');
  expect(
    await page.evaluate(() =>
      Boolean(document.querySelector('#sidebar')?.contains(document.activeElement)),
    ),
  ).toBe(true);
  await page.locator('#main').focus();
  expect(
    await page.evaluate(() =>
      Boolean(document.querySelector('#sidebar')?.contains(document.activeElement)),
    ),
  ).toBe(true);

  await close.click();
  await expectNavigationClosed();

  await openNavigation();
  const backdropBox = await backdrop.boundingBox();
  if (!backdropBox) throw new Error('Navigation backdrop is not rendered.');
  await backdrop.click({
    position: {
      x: Math.max(1, backdropBox.width - 2),
      y: Math.min(20, Math.max(1, backdropBox.height - 2)),
    },
  });
  await expectNavigationClosed();

  await openNavigation();
  await page.keyboard.press('Escape');
  await expectNavigationClosed();

  await openNavigation();
  await sidebar.getByRole('link', { name: 'Components', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Components' })).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-nav-open', 'false');
});

test('mobile laboratory exposes compact panels and dedicated status announcements', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.resolve() },
    });
  });
  await page.setViewportSize({ width: 320, height: 568 });
  await visit(page, '/components/dialog');
  await expect(page.locator('.lab-status')).toContainText('Scenario changed');

  const tablist = page.getByRole('tablist', { name: 'Laboratory panels' });
  const exampleTab = tablist.getByRole('tab', { name: 'Example' });
  const stateTab = tablist.getByRole('tab', { name: 'State' });
  const eventsTab = tablist.getByRole('tab', { name: 'Events' });
  const sourceTab = tablist.getByRole('tab', { name: 'Source' });
  const a11yTab = tablist.getByRole('tab', { name: 'A11y' });
  await expect(tablist).toBeVisible();
  await expect(exampleTab).toHaveAttribute('aria-selected', 'true');
  await expect(exampleTab).toHaveAttribute('aria-controls', 'lab-panel-example');
  const tabTargetSizes = await tablist.getByRole('tab').evaluateAll((tabs) =>
    tabs.map((tab) => {
      const rect = tab.getBoundingClientRect();
      return { height: rect.height, width: rect.width };
    }),
  );
  for (const size of tabTargetSizes) {
    expect(size.width).toBeGreaterThanOrEqual(24);
    expect(size.height).toBeGreaterThanOrEqual(24);
  }
  await expect(page.locator('#lab-panel-example')).toBeVisible();
  await expect(page.locator('#lab-panel-source')).toBeHidden();

  await page.getByRole('button', { name: 'Open dialog' }).click();
  await page.keyboard.press('Escape');
  await stateTab.click();
  await expect(stateTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#lab-panel-state')).toBeVisible();
  await expect(page.locator('#lab-panel-example')).toBeHidden();

  await eventsTab.click();
  const eventLog = page.locator('.event-output');
  await expect(eventLog).not.toHaveAttribute('aria-live');
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(eventLog).toHaveText('No events yet. Interact with the example.');
  await expect(page.locator('.lab-status')).toHaveText('Event log cleared.');

  await sourceTab.click();
  await expect(sourceTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#lab-panel-source')).toBeVisible();
  await page.getByRole('button', { name: 'Copy' }).click();
  await expect(page.locator('.copy-status')).toHaveText('Source copied.');
  await expect(page.locator('.copy-status')).not.toHaveAttribute('role');
  await expect(page.locator('.lab-status')).toHaveText('Source copied.');

  await a11yTab.click();
  await expect(a11yTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#lab-panel-a11y')).toBeVisible();
  await expect(page.locator('#lab-panel-a11y')).toContainText('Consumer responsibilities');
});

test('responsive demo routes avoid horizontal overflow and keep controls reachable', async ({
  page,
  browserName,
}) => {
  const routes = [
    '/',
    '/components',
    '/components/dialog',
    '/components/combobox',
    '/components/toast',
    '/components/tree-view',
    '/components/navigation-menu',
  ];
  const viewports = [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 360, height: 800 },
    { width: 320, height: 568 },
    ...(browserName === 'chromium'
      ? [
          { width: 1280, height: 800 },
          { width: 430, height: 932 },
        ]
      : []),
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await visit(page, route);
      const metrics = await inspectResponsiveLayout(page);
      expect(metrics.scrollWidth, `${viewport.width}px ${route}`).toBeLessThanOrEqual(
        metrics.innerWidth,
      );
      expect(metrics.topbarBottom, `${viewport.width}px ${route}`).toBeGreaterThan(0);
      expect(metrics.mainTop, `${viewport.width}px ${route}`).toBeGreaterThanOrEqual(
        metrics.topbarBottom - 1,
      );
      expect(metrics.clippedControls, `${viewport.width}px ${route}`).toEqual([]);
      expect(metrics.clippedRichContent, `${viewport.width}px ${route}`).toEqual([]);
      expect(metrics.trappedOverflow, `${viewport.width}px ${route}`).toEqual([]);
    }
  }
});

test('mobile search and theme controls remain visible and functional', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await visit(page);
  const searchButton = page.locator('.search-trigger');
  await expect(searchButton).toBeVisible();
  await searchButton.click();
  await page.getByRole('combobox', { name: 'Search pages' }).fill('Overview');
  await expect(page.getByRole('option', { name: /Overview.*Overview/u })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(searchButton).toBeFocused();

  const theme = page.getByLabel('Theme');
  await expect(theme).toBeVisible();
  await theme.selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('framework integration guides are navigable and reflow on mobile', async ({ page }) => {
  await page.goto('./docs/guide/');
  await page
    .getByRole('main')
    .getByRole('link', { name: 'Framework integration', exact: true })
    .click();
  await expect(page).toHaveURL(/\/docs\/guide\/framework-integration\.html$/u);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Framework integration' }),
  ).toBeVisible();

  for (const guide of frameworkGuides) {
    await page.goto('./docs/guide/framework-integration.html');
    await page.getByRole('main').getByRole('link', { name: guide.title, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/docs/guide/frameworks/${guide.id}\\.html$`, 'u'));
    await expect(page.getByRole('heading', { level: 1, name: guide.title })).toBeVisible();
  }

  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('./docs/guide/framework-integration.html');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  const sidebarNavigation = page.getByRole('navigation', { name: 'Sidebar Navigation' });
  const reactLink = sidebarNavigation.getByRole('link', {
    name: 'React integration',
    exact: true,
  });
  await expect(reactLink).toBeVisible();
  await reactLink.click();
  await expect(page.getByRole('heading', { level: 1, name: 'React integration' })).toBeVisible();

  const mobileRoutes = [
    'docs/guide/framework-integration.html',
    ...frameworkGuides.map((guide) => `docs/guide/frameworks/${guide.id}.html`),
  ];
  for (const route of mobileRoutes) {
    await page.goto(`./${route}`);
    const metrics = await inspectResponsiveLayout(page);
    expect(metrics.scrollWidth, route).toBeLessThanOrEqual(metrics.innerWidth);
    expect(metrics.clippedRichContent, route).toEqual([]);
    expect(metrics.trappedOverflow, route).toEqual([]);
  }
});

test('composed docs, API, and coverage sections contain responsive rich content', async ({
  page,
  browserName,
}) => {
  const routes = [
    'docs/',
    'docs/guide/',
    'docs/guide/getting-started.html',
    'docs/guide/accessibility.html',
    'docs/accessibility/demo-conformance.html',
    'docs/components/dialog.html',
    'docs/components/combobox.html',
    'docs/architecture/overview.html',
    'api/',
    'coverage/',
  ];
  const viewports = [
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    ...(browserName === 'chromium'
      ? [
          { width: 1280, height: 800 },
          { width: 430, height: 932 },
          { width: 360, height: 800 },
        ]
      : []),
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(`./${route}`);
      const metrics = await inspectResponsiveLayout(page);
      expect(metrics.scrollWidth, `${viewport.width}px ${route}`).toBeLessThanOrEqual(
        metrics.innerWidth,
      );
      expect(metrics.clippedRichContent, `${viewport.width}px ${route}`).toEqual([]);
      expect(metrics.trappedOverflow, `${viewport.width}px ${route}`).toEqual([]);
    }
  }
});
