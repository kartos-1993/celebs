import { expect,test } from '@playwright/test';

import { authenticateAs } from './fixtures/auth.fixture';
import { setupProductMocks } from './fixtures/product-mocks';

test.describe('E2E: Product Editing Flow for Vendor and Staff', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAs(page, 'VENDOR');
    await setupProductMocks(page);
  });

  test('should load existing product, hydrate all form fields, update metadata and prices, and submit update successfully', async ({
    page,
  }) => {
    // ── 1. Navigate to Edit Product Route ────────────────────────────────────
    await page.goto('/products/edit/prod_existing_101', { waitUntil: 'domcontentloaded' });

    // ── 2. Verify Hydration of Existing Product Metadata & Category ─────────
    const categoryTrigger = page.getByTestId('category-cascading-trigger');
    await expect(categoryTrigger).toBeVisible({ timeout: 15000 });
    await expect(categoryTrigger).toContainText(/Tops & T-Shirts/i);

    const nameInput = page.getByTestId('product-name-input');
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    await expect(nameInput).toHaveValue('Original Heavyweight Vintage Tee');

    const brandInput = page.getByTestId('product-brand-input');
    await expect(brandInput).toHaveValue('Celebs Luxury Studio');

    const descInput = page.getByTestId('product-desc-input');
    await expect(descInput).toHaveValue('Original crafted vintage tee description.');

    // ── 3. Modify Fields (Name, Description, Base Price) ─────────────────────
    await nameInput.fill('Updated Heavyweight Vintage Tee - 2026 Edition');
    await descInput.fill('Updated premium description with sustainable combed cotton.');

    const basePriceInput = page.locator('input[name="price"]').first();
    if (await basePriceInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await basePriceInput.scrollIntoViewIfNeeded();
      await basePriceInput.fill('2400');
    }

    // ── 4. Modify / Apply Bulk Price & Stock across SKU matrix ───────────────
    const bulkPriceInput = page.getByTestId('sku-bulk-price-input');
    if (await bulkPriceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bulkPriceInput.scrollIntoViewIfNeeded();
      await bulkPriceInput.fill('2400');
      await page.getByTestId('sku-bulk-stock-input').fill('50');
      await page.getByTestId('sku-bulk-apply-btn').click();
    }

    // ── 5. Submit Update Form ────────────────────────────────────────────────
    const submitBtn = page.getByTestId('submit-product-btn');
    await submitBtn.scrollIntoViewIfNeeded();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // ── 6. Assert Toast or Redirection to Manage Products ────────────────────
    await expect(page).toHaveURL(/products\/manage/, { timeout: 10000 });
  });

  test('should allow Staff with PRODUCT_EDIT permission to edit and update product', async ({
    page,
  }) => {
    await authenticateAs(page, 'STAFF');
    await page.goto('/products/edit/prod_existing_101', { waitUntil: 'domcontentloaded' });

    const nameInput = page.getByTestId('product-name-input');
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    await expect(nameInput).toHaveValue('Original Heavyweight Vintage Tee');

    await nameInput.fill('Staff Curated Vintage Tee - Approved');
    const submitBtn = page.getByTestId('submit-product-btn');
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    await expect(page).toHaveURL(/products\/manage/, { timeout: 10000 });
  });
});
