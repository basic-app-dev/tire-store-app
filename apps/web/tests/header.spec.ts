import { test, expect } from '@playwright/test';

test('reference header has centered navigation and an outer cart', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('header');
  const nav = header.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav.locator('a, button')).toHaveText(['Shop Products', 'Services', 'Why Choose Steven?', 'Financing', 'Find a Store']);
  await expect(header.getByRole('link', { name: 'Book service' })).toHaveCount(0);
  const cart = header.getByRole('link', { name: 'View cart' });
  await expect(cart).toBeVisible();
  const box = await header.boundingBox();
  expect(box?.height).toBe(80);
  await header.getByRole('button', { name: 'Financing', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Financing details are not available yet.');
  await page.getByRole('button', { name: 'Close financing information' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(cart).toBeVisible();
  await expect(nav).not.toBeVisible();
  await header.getByRole('button', { name: 'Open menu' }).click();
  await expect(nav).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nav).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
