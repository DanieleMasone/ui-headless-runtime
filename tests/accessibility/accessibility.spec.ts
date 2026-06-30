import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { componentRegistry } from '../../apps/demo/src/registry/components';

const analyze = async (page: Page) => {
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations,
    result.violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n'),
  ).toEqual([]);
};

const interact = async (page: Page, id: string) => {
  const live = page.locator('.example-mount');
  if (id === 'tooltip') {
    await live.getByRole('button', { name: 'Inspect deployment status' }).focus();
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
    if ((await buttons.count()) > 0) await buttons.nth(0).click();
  }
};

test('home has no detectable axe violations and exposes landmarks', async ({ page }) => {
  await page.goto('./#/');
  await analyze(page);
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Documentation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
    'href',
    '#main',
  );
});

for (const component of componentRegistry) {
  test(`${component.name} initial and interactive states pass axe`, async ({ page }) => {
    await page.goto(`./#${component.route}`);
    await analyze(page);
    await interact(page, component.id);
    await analyze(page);
  });
}

test('Dialog traps focus, Escape closes, and trigger focus is restored', async ({ page }) => {
  await page.goto('./#/components/dialog');
  const trigger = page.getByRole('button', { name: 'Open dialog' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Account confirmation' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close dialog' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Close dialog' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('Tabs and Listbox implement manual keyboard contracts', async ({ page }) => {
  await page.goto('./#/components/tabs');
  const activity = page.getByRole('tab', { name: 'Activity' });
  await activity.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Members' })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(activity).toBeFocused();

  await page.goto('./#/components/listbox');
  const listbox = page.getByRole('listbox');
  await listbox.focus();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('option', { name: 'Oslo' })).toHaveAttribute('aria-selected', 'true');
});

test('Disabled composite items are exposed and skipped by keyboard navigation', async ({
  page,
}) => {
  await page.goto('./#/components/listbox');
  await page.getByLabel('Scenario').selectOption('disabled');
  const listbox = page.getByRole('listbox', { name: 'Deployment region' });
  const berlin = page.getByRole('option', { name: 'Berlin' });
  await expect(berlin).toHaveAttribute('aria-disabled', 'true');
  await listbox.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await expect(listbox).toHaveAttribute('aria-activedescendant', 'oslo');
});
