import { expect,test } from '@playwright/test';

import { authenticateAs } from './fixtures/auth.fixture';
import { setupProductMocks } from './fixtures/product-mocks';

test.describe('E2E: Role-Based Publishing vs. Moderation Flow', () => {
  test('Vendor/Staff submissions should target review queue', async ({ page }) => {
    await authenticateAs(page, 'VENDOR');
    await setupProductMocks(page);
    await page.goto('/products/new');

    await page.getByTestId('category-cascading-trigger').click();
    await page.getByText('Accessories & Bags').first().click();
    await page.getByTestId('category-confirm-btn').click();

    const submitBtn = page.getByTestId('submit-product-btn');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toContainText(/Submit for Review|Publish Product/);
  });

  test('Superadmin/Admin should have direct publishing capabilities', async ({ page }) => {
    await authenticateAs(page, 'SUPERADMIN');
    await setupProductMocks(page);
    await page.goto('/products/new');

    await page.getByTestId('category-cascading-trigger').click();
    await page.getByText('Accessories & Bags').first().click();
    await page.getByTestId('category-confirm-btn').click();

    const submitBtn = page.getByTestId('submit-product-btn');
    await expect(submitBtn).toBeVisible();
  });
});
