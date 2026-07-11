import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { componentCatalog } from '../../metadata/components';

const analyze = async (page: Page) => {
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations,
    result.violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n'),
  ).toEqual([]);
};

const expectReasonableHeadingOrder = async (page: Page) => {
  const levels = await page
    .getByRole('main')
    .locator('h1, h2, h3, h4, h5, h6')
    .evaluateAll((headings) =>
      headings
        .filter((heading) => {
          const element = heading as HTMLElement;
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.height > 0;
        })
        .map((heading) => Number(heading.tagName.slice(1))),
    );
  expect(levels.length).toBeGreaterThan(0);
  expect(levels[0]).toBe(1);
  for (let index = 1; index < levels.length; index += 1) {
    expect(
      levels[index],
      `Heading level ${levels[index]} follows level ${levels[index - 1]}.`,
    ).toBeLessThanOrEqual((levels[index - 1] ?? 1) + 1);
  }
};

const expectDocumentationPagesAccessible = async (
  page: Page,
  routes: readonly string[],
): Promise<void> => {
  for (const route of routes) {
    await page.goto(`./${route}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expectReasonableHeadingOrder(page);
    await analyze(page);
  }
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

test('home exposes landmarks, logical headings, keyboard focus, and a working skip link', async ({
  page,
}) => {
  await page.goto('./#/');
  await analyze(page);
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Documentation' })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expectReasonableHeadingOrder(page);
  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await expect(skipLink).toHaveAttribute('href', '#main');
  await page.keyboard.press('Tab');
  await expect(skipLink).toBeFocused();
  const focusIndicator = await skipLink.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
  });
  expect(focusIndicator.style).not.toBe('none');
  expect(focusIndicator.width).toBeGreaterThanOrEqual(2);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Behavior infrastructure');

  await page.getByLabel('Theme').selectOption('dark');
  await analyze(page);

  const search = page.getByRole('button', { name: 'Search documentation' });
  await search.focus();
  await expect(search).toBeFocused();
  const overview = page
    .getByRole('navigation', { name: 'Documentation' })
    .getByRole('link', { name: 'Overview' });
  await overview.focus();
  await expect(overview).toBeFocused();
  const repository = page.getByRole('contentinfo').getByRole('link', { name: 'GitHub' });
  await repository.focus();
  await expect(repository).toBeFocused();
});

test('mobile navigation and command search active states pass axe', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('./#/');
  const targetSizes = await page.locator('.topbar button, .topbar select').evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { height: rect.height, width: rect.width };
    }),
  );
  for (const size of targetSizes) {
    expect(size.width).toBeGreaterThanOrEqual(24);
    expect(size.height).toBeGreaterThanOrEqual(24);
  }
  const navigationTrigger = page.locator('.mobile-menu');
  await navigationTrigger.click();
  await expect(page.getByRole('dialog', { name: 'Site navigation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close navigation' })).toBeFocused();
  await analyze(page);
  await page.keyboard.press('Escape');
  await expect(navigationTrigger).toBeFocused();

  const searchTrigger = page.locator('.search-trigger');
  await searchTrigger.click();
  await expect(page.getByRole('dialog', { name: 'Documentation search' })).toBeVisible();
  await expect(page.getByLabel('Search pages')).toBeFocused();
  await expect(page.getByRole('listbox', { name: 'Search results' })).toBeVisible();
  await analyze(page);
});

test('generated documentation critical pages pass axe with coherent headings', async ({ page }) => {
  await expectDocumentationPagesAccessible(page, [
    'docs/',
    'docs/guide/',
    'docs/guide/getting-started.html',
    'docs/guide/accessibility.html',
    'docs/components/dialog.html',
    'docs/architecture/overview.html',
    'docs/accessibility/demo-conformance.html',
  ]);
});

for (const frameworkPage of [
  { name: 'Framework landing', route: 'docs/guide/framework-integration.html' },
  { name: 'React', route: 'docs/guide/frameworks/react.html' },
  { name: 'Vue', route: 'docs/guide/frameworks/vue.html' },
  { name: 'Angular', route: 'docs/guide/frameworks/angular.html' },
]) {
  test(`${frameworkPage.name} integration documentation passes axe with coherent headings`, async ({
    page,
  }) => {
    await expectDocumentationPagesAccessible(page, [frameworkPage.route]);
  });
}

test('generated documentation mobile navigation is named, related, and operable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('./docs/');
  const navigation = page.getByRole('button', { name: 'mobile navigation' });
  await expect(navigation).toHaveAttribute('aria-expanded', 'false');
  const controlledId = await navigation.getAttribute('aria-controls');
  expect(controlledId).toBeTruthy();
  await navigation.click();
  await expect(navigation).toHaveAttribute('aria-expanded', 'true');
  const navigationScreen = page.locator(`#${controlledId ?? 'missing-navigation-screen'}`);
  await expect(navigationScreen).toBeVisible();
  const userGuide = navigationScreen.getByRole('link', { name: 'User Guide', exact: true });
  await userGuide.focus();
  await expect(userGuide).toBeFocused();
  await analyze(page);
  await userGuide.click();
  await expect(page).toHaveURL(/\/docs\/guide\/$/u);
  await expect(page.getByRole('heading', { level: 1, name: 'User Guide' })).toBeVisible();
});

test('demo and documentation withstand WCAG text spacing and user display preferences', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  for (const route of ['./#/components/dialog', './docs/guide/accessibility.html']) {
    await page.goto(route);
    await page.addStyleTag({
      content: `
        body, p, li, dd, dt, a, button, input, select {
          line-height: 1.5 !important;
          letter-spacing: 0.12em !important;
          word-spacing: 0.16em !important;
        }
        p { margin-block-end: 2em !important; }
      `,
    });
    const dimensions = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth, route).toBeLessThanOrEqual(dimensions.innerWidth);
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/');
  const transitionMilliseconds = await page
    .getByRole('button', { name: 'Search documentation' })
    .evaluate((element) =>
      getComputedStyle(element)
        .transitionDuration.split(',')
        .map((value) => value.trim())
        .map((value) =>
          value.endsWith('ms') ? Number.parseFloat(value) : Number.parseFloat(value) * 1000,
        ),
    );
  expect(Math.max(...transitionMilliseconds)).toBeLessThanOrEqual(1);

  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  const search = page.getByRole('button', { name: 'Search documentation' });
  await search.focus();
  const forcedColorsOutline = await search.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
  });
  expect(forcedColorsOutline.style).not.toBe('none');
  expect(forcedColorsOutline.width).toBeGreaterThanOrEqual(2);
});

for (const component of componentCatalog) {
  test(`${component.name} initial and interactive states pass axe`, async ({ page }) => {
    await page.goto(`./#${component.route}`);
    await expect(page.locator('.lab-status')).toContainText('Scenario changed');
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
