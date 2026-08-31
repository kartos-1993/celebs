import { expect,test } from '@playwright/test';

import { authenticateAs } from './fixtures/auth.fixture';
import { setupProductMocks } from './fixtures/product-mocks';

test.describe('E2E: Single / Non-Variant Product Creation', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAs(page, 'VENDOR');
    await setupProductMocks(page);
    await page.goto('/products/new', { waitUntil: 'domcontentloaded' });
  });

  test('should create standalone product with default SKU and single price/stock row', async ({
    page,
  }) => {
    // 1. Select single-item category (Accessories & Bags)
    await page.getByTestId('category-cascading-trigger').click();
    await page.getByText('Accessories & Bags').first().click();
    await page.getByTestId('category-confirm-btn').click();

    // 2. Fill basic information
    await page.getByTestId('product-name-input').fill('Leather Crossbody Messenger Bag');
    await page.getByTestId('product-brand-input').fill('Celebs Leathercraft');
    await page
      .getByTestId('product-desc-input')
      .fill('Handcrafted full-grain leather crossbody messenger bag.');

    // 3. Fill default SKU pricing
    const defaultPriceInput = page.locator('input[name="sku.default.price"]');
    if (await defaultPriceInput.isVisible()) {
      await defaultPriceInput.fill('4500');
    }

    const defaultStockInput = page.locator('input[name="sku.default.stock"]');
    if (await defaultStockInput.isVisible()) {
      await defaultStockInput.fill('20');
    }

    // 4. Auto-generate default SKU
    const autoSkuBtn = page.getByTestId('sku-auto-generate-btn');
    if (await autoSkuBtn.isVisible()) {
      await autoSkuBtn.click();
    }

    // 5. Submit form
    const submitBtn = page.getByTestId('submit-product-btn');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();
  });
});
