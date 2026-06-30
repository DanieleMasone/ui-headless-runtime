import { expect, test, type Page } from '@playwright/test';
import { componentRegistry } from '../../apps/demo/src/registry/components';

const visit = async (page: Page, path = '/') => {
  await page.goto(`./#${path}`);
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

  await visit(page, '/components/dialog');
  await expect(page.getByRole('heading', { level: 1, name: 'Dialog' })).toBeVisible();
});

for (const component of componentRegistry) {
  test(`${component.name} laboratory uses the live controller`, async ({ page }) => {
    await visit(page, component.route);
    await expect(page.getByRole('heading', { level: 1, name: component.name })).toBeVisible();
    await expect(page.locator('.state-output')).not.toBeEmpty();
    await interact(page, component.id);
    await expect(page.locator('.event-output')).toContainText('stateChange');
    await expect(
      page.locator('#main').getByRole('link', { name: 'API reference' }),
    ).toHaveAttribute('href', /api\//u);
    await expect(page.getByRole('heading', { name: 'Executed source' })).toBeVisible();
  });
}

test('scenario selection, source copy, API and coverage links are wired', async ({ page }) => {
  await visit(page, '/components/dialog');
  const scenarios = page.getByLabel('Scenario');
  await scenarios.selectOption('nested');
  await expect(page.locator('.scenario-description')).toContainText('topmost');
  await page.getByRole('button', { name: 'Copy' }).click();
  await expect(page.getByRole('status')).not.toBeEmpty();
  await expect(page.locator('#main').getByRole('link', { name: 'API reference' })).toHaveAttribute(
    'href',
    /ui-headless-runtime\/api\//u,
  );

  const coverage = page.locator('.sidebar a[href$="coverage/"]');
  await expect(coverage).toHaveAttribute('href', /ui-headless-runtime\/coverage\//u);
});

test('high-risk scenarios exercise nested overlays, async data, queues, trees, and compact navigation', async ({
  page,
}) => {
  await visit(page, '/components/dialog');
  await page.getByLabel('Scenario').selectOption('nested');
  await page.getByRole('button', { name: 'Open dialog' }).click();
  const parent = page.getByRole('dialog', { name: 'Account confirmation' });
  await page.getByRole('button', { name: 'Open nested dialog' }).click();
  const nested = page.getByRole('dialog', { name: 'Nested confirmation' });
  await expect(nested).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nested).toBeHidden();
  await expect(parent).toBeVisible();

  await visit(page, '/components/combobox');
  await page.getByLabel('Scenario').selectOption('async');
  const combobox = page.getByRole('combobox', { name: 'Assign owner' });
  await combobox.fill('A');
  await combobox.fill('Ada');
  await expect(page.getByRole('option', { name: 'Ada (remote)', exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: 'A (remote)', exact: true })).toHaveCount(0);

  await visit(page, '/components/toast');
  await page.getByLabel('Scenario').selectOption('promise');
  await page.getByRole('button', { name: 'Track deployment promise' }).click();
  await expect(page.getByText('Deployed to production', { exact: true })).toBeVisible();

  await visit(page, '/components/tree-view');
  await page.getByLabel('Scenario').selectOption('dynamic');
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
  await page.getByLabel('Scenario').selectOption('compact');
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
  await expect(page.getByRole('link', { name: 'Source documentation' })).toHaveAttribute(
    'href',
    /docs\//u,
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
  await menu.click();
  await expect(page.locator('body')).toHaveAttribute('data-nav-open', 'true');
  await page.locator('#sidebar').getByRole('link', { name: 'Components', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Components' })).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-nav-open', 'false');
});
