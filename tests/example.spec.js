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
