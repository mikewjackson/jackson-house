const { test, expect } = require('@playwright/test');

test('homepage exposes canonical and AI discovery metadata', async ({ page }) => {
  const response = await page.goto('/');
  expect(response).not.toBeNull();
  expect(await response.text()).not.toMatch(/\r?\n[ \t]*\r?\n[ \t]*\r?\n/);
  await expect(page).toHaveTitle(/Jackson House/i);
  const hero = await page.locator('.hero').first().textContent();
  expect(hero).toBeTruthy();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://jacksonhousewoodinville.com'
  );
  await expect(page.locator('link[rel="describedby"]')).toHaveAttribute(
    'href',
    'https://jacksonhousewoodinville.com/llms.txt'
  );
  await expect(page.locator('script[type="application/ld+json"]')).not.toContainText('aggregateRating');

  const llmsResponse = await page.request.get('/llms.txt');
  expect(llmsResponse.ok()).toBeTruthy();
  expect(await llmsResponse.text()).toContain('[All upcoming events]');
});

test('visit answers are available in the AI summary, not homepage HTML', async ({ page }) => {
  const response = await page.goto('/');
  expect(await response.text()).not.toContain('Planning Your Visit');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Seasonal Dining & Craft Cocktails in Woodinville'
  );
  await expect(page.locator('.visit-questions')).toHaveCount(0);
  const summary = await (await page.request.get('/llms.txt')).text();
  expect(summary).toContain('## Planning Your Visit');
  expect(summary).toContain('Walk-ins are welcome');
  expect(summary).toContain('self-service');
  expect(summary).toContain('free parking validation');
  expect(summary).toContain('food allergies');
});

test('private events remains accessible but excluded from discovery', async ({ page }) => {
  const response = await page.goto('/private-events.html');
  expect(response.ok()).toBeTruthy();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
  for (const path of ['/sitemap.xml', '/llms.txt', '/robots.txt']) {
    const discovery = await page.request.get(path);
    expect(discovery.ok()).toBeTruthy();
    expect(await discovery.text()).not.toContain('private-events.html');
  }
});

test('every menu fragment restores its tab on direct load', async ({ page }) => {
  for (const key of ['dining', 'lounge', 'after_dinner', 'whiskey', 'cocktail', 'beer', 'wine', 'happy-hour']) {
    await page.goto(`/menu.html#${key}`);
    await expect(page.locator(`#tab-${key}`)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator(`#${key}-panel`)).toBeVisible();
    await expect(page.locator('[role="tabpanel"]:visible')).toHaveCount(1);
    await expect(page.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
  }
});

test('menu selection supports URL updates, history, keyboard, and unknown fragments', async ({ page }) => {
  await page.goto('/menu.html');
  await page.getByRole('tab', { name: 'Cocktails', exact: true }).click();
  await expect(page).toHaveURL(/#cocktail$/);
  await page.getByRole('tab', { name: 'Happy Hour', exact: true }).click();
  await expect(page).toHaveURL(/#happy-hour$/);
  await page.goBack();
  await expect(page.locator('#cocktail-panel')).toBeVisible();
  await page.goForward();
  await expect(page.locator('#happy-hour-panel')).toBeVisible();
  await page.getByRole('tab', { name: 'Happy Hour', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/#dining$/);
  await expect(page.locator('#tab-dining')).toBeFocused();
  await page.evaluate(() => { window.location.hash = 'wine'; });
  await expect(page.locator('#wine-panel')).toBeVisible();
  await page.goto('/menu.html#unknown');
  await expect(page.locator('#dining-panel')).toBeVisible();
});
