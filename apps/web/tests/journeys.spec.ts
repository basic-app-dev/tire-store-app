import { test, expect } from '@playwright/test';
test('booking and cart show their current navigation state', async ({ page }) => {
  await page.goto('/booking');
  await expect(
    page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Book service' })
  ).toHaveAttribute('aria-current', 'page');
  await page.goto('/checkout');
  await expect(page.getByRole('link', { name: 'View cart' })).toHaveAttribute(
    'aria-current',
    'page'
  );
});
test('all public demo routes fit mobile, tablet and desktop without runtime errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      '/',
      '/catalog',
      '/catalog/all-road-comfort',
      '/services',
      '/booking',
      '/checkout',
      '/stores',
      '/admin',
    ]) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await expect(page.locator('main h1')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${route} at ${width}px`
      ).toBeTruthy();
    }
  }
  expect(errors).toEqual([]);
});
test('catalog filters, sorts and recovers from no matches', async ({ page }) => {
  await page.goto('/catalog');
  await expect(page.locator('.product-card')).toHaveCount(6);
  await page.getByLabel('Tire size', { exact: true }).selectOption('235/45R18');
  await expect(page.locator('.product-card')).toHaveCount(2);
  await page.getByLabel('Season', { exact: true }).selectOption('Winter');
  await expect(page.getByText('No tires match your selection.')).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await page.getByLabel('Sort tires').selectOption('price-low');
  await expect(page.locator('.product-card h2').first()).toHaveText('Everyday Touring');
  await page.getByLabel('Shop by').selectOption('vehicle');
  await page.getByLabel('Sample vehicle').selectOption('camry');
  await expect(page.locator('.product-card')).toHaveCount(2);
  await page.reload();
  await expect(page.getByLabel('Sample vehicle')).toHaveValue('camry');
});
test('product selection becomes an editable persistent demo cart', async ({ page }) => {
  await page.goto('/catalog/all-road-comfort');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('All Road Comfort');
  await page.getByLabel('Quantity', { exact: true }).selectOption('2');
  await page.getByLabel('Add installation').check();
  await page.getByRole('button', { name: 'Add to demo cart' }).click();
  await page.getByRole('link', { name: 'Review demo cart' }).click();
  await expect(page.getByTestId('demo-total')).toHaveText('$428.00');
  await page.getByLabel('Quantity for All Road Comfort').selectOption('4');
  await expect(page.getByTestId('demo-total')).toHaveText('$856.00');
  await page.reload();
  await expect(page.getByLabel('Quantity for All Road Comfort')).toHaveValue('4');
  await page.getByRole('button', { name: 'Finish demo' }).click();
  await expect(
    page.getByRole('heading', { name: 'Demo complete. Nothing booked or charged.' })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Back to cart' }).click();
  await page.getByRole('button', { name: 'Remove All Road Comfort' }).click();
  await expect(page.getByRole('heading', { name: 'Your demo cart is empty.' })).toBeVisible();
});
test('booking validates each step, disables unavailable slots and keeps its summary', async ({
  page,
}) => {
  await page.goto('/booking?service=wheel_alignment');
  await expect(page.getByLabel('Service', { exact: true })).toHaveValue('wheel_alignment');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('p[role="alert"]')).toHaveText('Choose a sample vehicle to continue.');
  await page.getByLabel('Vehicle', { exact: true }).selectOption('camry');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Location', { exact: true }).selectOption('sample');
  await page.getByLabel('Date', { exact: true }).fill('2027-01-15');
  await expect(page.getByRole('button', { name: '11:30 AM Unavailable' })).toBeDisabled();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('p[role="alert"]')).toHaveText(
    'Choose a sample location, a future date and an available time.'
  );
  await page.getByRole('button', { name: '10:00 AM Available' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review your sample visit.' })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('complementary').getByText('10:00 AM', { exact: true })
  ).toBeVisible();
  await page.getByRole('link', { name: 'Review demo checkout' }).click();
  await expect(page.getByTestId('demo-total')).toHaveText('$110.00');
  await page.getByRole('button', { name: 'Finish demo' }).click();
  await expect(
    page.getByRole('heading', { name: 'Demo complete. Nothing booked or charged.' })
  ).toBeVisible();
});
test('photographs load locally and the manager route is explicitly illustrative', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.image-link img').first()).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('.image-link img')
        .evaluateAll((images) =>
          images.every(
            (img) =>
              (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0
          )
        )
    )
    .toBeTruthy();
  await page.goto('/admin');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A view of the workshop.');
  await expect(
    page.getByText('Illustrative dashboard · no live customer or bay data')
  ).toBeVisible();
});
test('shared navigation and responsive landing', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: 'Steven Mechanics', exact: true }).first()
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A better drive starts here.');
  await expect(page.locator('.image-link')).toHaveCount(2);
  await expect(page.locator('.info-item')).toHaveCount(6);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Services', exact: true })
    .click();
  await expect(page).toHaveURL(/services/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Good care. More miles.');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  ).toBeTruthy();
});
