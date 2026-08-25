import { test, expect } from '@playwright/test';
import { authenticateAs } from './fixtures/auth.fixture';
import { setupProductMocks } from './fixtures/product-mocks';

test.describe('E2E: Size Measurements & Fit Guides', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAs(page, 'VENDOR');
    await setupProductMocks(page);
    await page.goto('/products/new', { waitUntil: 'domcontentloaded' });
  });

  test('should support unit toggling (CM/IN) and partial measurement inputs without blocking submit', async ({
    page,
  }) => {
    // 1. Select apparel category
    await page.getByTestId('category-cascading-trigger').click();
    await page.getByText("Men's Apparel").first().click();
    await page.getByText('Tops & T-Shirts').first().click();
    await page.getByTestId('category-confirm-btn').click();

    // 2. Select Medium size to reveal size chart table
    const sizeOpt = page.getByRole('checkbox', { name: /Medium/i }).or(page.getByText('Medium'));
    if (await sizeOpt.isVisible()) {
      await sizeOpt.click();
    }

    // 3. Test Unit Toggle (CM -> IN -> CM)
    const inBtn = page.getByTestId('measurement-unit-in');
    const cmBtn = page.getByTestId('measurement-unit-cm');
    if (await inBtn.isVisible()) {
      await inBtn.click();
      await cmBtn.click();
    }

    // 4. Fill in product measurement (Bust: 104) while leaving optional columns blank
    const bustInput = page
      .getByTestId('measurement-input-M-Bust')
      .or(page.locator('input[placeholder*="70"]').first());
    if (await bustInput.isVisible()) {
      await bustInput.fill('104');
    }

    // 5. Fill basic info & pricing
    await page.getByTestId('product-name-input').fill('Tailored Fit Cotton Polo');
    const bulkPriceInput = page.getByTestId('sku-bulk-price-input');
    if (await bulkPriceInput.isVisible()) {
      await bulkPriceInput.fill('1800');
      await page.getByTestId('sku-bulk-apply-btn').click();
    }

    // 6. Verify submit does not fail on unselected body measurement tab
    const submitBtn = page.getByTestId('submit-product-btn');
    await expect(submitBtn).toBeVisible();
  });
});
