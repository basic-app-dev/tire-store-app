import { test, expect } from '@playwright/test';

test('categories switch locally and unavailable shopping remains honest', async ({ page }) => {
  await page.goto('/services');
  await page.getByRole('button', { name: 'Shop Products', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Shop Products', exact: true });
  await expect(panel.getByRole('button', { name: 'Tires', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(panel.getByRole('heading', { name: 'Find your next set of tires' })).toBeVisible();
  for (const name of ['Wheels', 'Parts & Accessories', 'Special Offers']) {
    await panel.getByRole('button', { name, exact: true }).click();
    await expect(panel.getByRole('button', { name, exact: true })).toHaveAttribute('aria-expanded', 'true');
    await expect(panel.getByRole('region', { name, exact: true }).getByText(/not available in this preview/)).toBeVisible();
    await expect(page).toHaveURL('/services');
    await expect(panel.locator('a[href="/catalog"], a[href="#"]')).toHaveCount(0);
  }
  await panel.getByRole('button', { name: 'Tires', exact: true }).click();
  await expect(panel.getByText('The tire catalog is not available in this preview.')).toBeVisible();
  await expect(panel.getByRole('link', { name: 'Explore tire services' })).toHaveAttribute('href', '/services');
});

test('dismissal restores focus, outside clicks and navigation close across shared pages', async ({ page }) => {
  for (const path of ['/', '/services', '/stores', '/checkout']) {
    await page.goto(path);
    const trigger = page.getByRole('button', { name: 'Shop Products', exact: true });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Tires', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await page.locator('main').click({ position: { x: 10, y: 620 }, force: true });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await page.getByRole('region', { name: 'Shop Products', exact: true }).getByRole('link', { name: 'Explore tire services' }).click();
    await expect(page).toHaveURL('/services');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('heading', { name: 'A little care goes a long way.' })).toBeVisible();
  }
});

test('Shop Products is a floating disclosure without navigation or layout shift', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Shop Products', exact: true });
  const before = await page.locator('main').boundingBox();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('region', { name: 'Shop Products' })).toBeVisible();
  expect(await page.locator('main').boundingBox()).toEqual(before);
  await expect(page).toHaveURL('/');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});
