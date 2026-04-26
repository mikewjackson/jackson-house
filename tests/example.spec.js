const { test, expect } = require('@playwright/test');

test('homepage loads and has hero', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Jackson House/i);
  const hero = await page.locator('.hero').first().textContent();
  expect(hero).toBeTruthy();
});
