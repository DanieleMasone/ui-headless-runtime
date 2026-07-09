import { expect, test, type Page } from '@playwright/test';
import { componentCatalog } from '../../metadata/components';

const visit = async (page: Page, path = '/') => {
  await page.goto(`./#${path}`);
};

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
  const search = page.getByRole('searchbox', { name: 'Search pages' });
  await search.fill('Combobox');
  await page.getByRole('option', { name: 'Components — Combobox' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Combobox' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Behavior infrastructure');
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1, name: 'Combobox' })).toBeVisible();

  await page.getByRole('button', { name: 'Search documentation' }).click();
  await page.getByRole('searchbox', { name: 'Search pages' }).fill('User Guide');
  await page.getByRole('option', { name: /Guides.*User Guide/u }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'User Guide' })).toBeVisible();

  await visit(page, '/components/dialog');
  await expect(page.getByRole('heading', { level: 1, name: 'Dialog' })).toBeVisible();
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
  await visit(page, '/components/dialog');
  await selectScenario(page, 'nested');
  await expect(page.locator('.scenario-description')).toContainText('topmost');
  const sourcePanel = page.locator('.lab-source code');
  await expect(sourcePanel).toContainText('createDialog');
  const dialogSource = await sourcePanel.textContent();
  await page.getByRole('button', { name: 'Copy' }).click();
  await expect(page.locator('.copy-status')).not.toBeEmpty();
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

test('mobile navigation opens, navigates, and closes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page);
  const menu = page.getByRole('button', { name: 'Open navigation' });
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('body')).toHaveAttribute('data-nav-open', 'true');
  await expect(page.locator('#sidebar')).toHaveAttribute('role', 'dialog');
  await expect(page.getByRole('button', { name: 'Close navigation' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).toHaveAttribute('data-nav-open', 'false');
  await expect(menu).toBeFocused();
  await menu.click();
  await page.mouse.click(380, 96);
  await expect(page.locator('body')).toHaveAttribute('data-nav-open', 'false');
  await menu.click();
  await page.locator('#sidebar').getByRole('link', { name: 'Components', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Components' })).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-nav-open', 'false');
});

test('responsive demo routes avoid horizontal overflow and keep controls reachable', async ({
  page,
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
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await visit(page, route);
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        topbar: document.querySelector('.topbar')?.getBoundingClientRect().height ?? 0,
        mainTop: document.querySelector('main')?.getBoundingClientRect().top ?? -1,
      }));
      expect(metrics.scrollWidth, `${viewport.width}px ${route}`).toBeLessThanOrEqual(
        metrics.innerWidth,
      );
      expect(metrics.topbar).toBeGreaterThan(0);
      expect(metrics.mainTop).toBeGreaterThanOrEqual(0);
    }
  }
});

test('mobile search and theme controls remain visible and functional', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await visit(page);
  const searchButton = page.getByRole('button', { name: 'Search documentation' });
  await expect(searchButton).toBeVisible();
  await searchButton.click();
  await page.getByRole('searchbox', { name: 'Search pages' }).fill('Overview');
  await expect(page.getByRole('option', { name: /Overview.*Overview/u })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(searchButton).toBeFocused();

  const theme = page.getByLabel('Theme');
  await expect(theme).toBeVisible();
  await theme.selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('composed docs, API, and coverage sections avoid horizontal overflow', async ({ page }) => {
  const routes = [
    'docs/',
    'docs/guide/',
    'docs/components/dialog.html',
    'docs/architecture/overview.html',
    'api/',
    'coverage/',
  ];
  const viewports = [
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(`./${route}`);
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(metrics.scrollWidth, `${viewport.width}px ${route}`).toBeLessThanOrEqual(
        metrics.innerWidth,
      );
    }
  }
});
