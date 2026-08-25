import { test, expect } from '@playwright/test';
import { authenticateAs } from './fixtures/auth.fixture';
import { setupProductMocks } from './fixtures/product-mocks';

test.describe('E2E: Product Draft Persistence & Page Reload', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAs(page, 'VENDOR');
    await setupProductMocks(page);
    await page.goto('/products/new', { waitUntil: 'domcontentloaded' });
  });

  test('should save draft and restore form state accurately after page reload', async ({
    page,
  }) => {
    // 1. Select category
    await page.getByTestId('category-cascading-trigger').click();
    await page.getByText("Men's Apparel").first().click();
    await page.getByText('Tops & T-Shirts').first().click();
    await page.getByTestId('category-confirm-btn').click();

    // 2. Fill basic metadata
    await page.getByTestId('product-name-input').fill('Drafted Linen Summer Shirt');
    await page.getByTestId('product-brand-input').fill('Celebs Resort');
    await page
      .getByTestId('product-desc-input')
      .fill('Breathable pure French linen casual button-down shirt.');

    // 3. Click Save Draft
    const saveDraftBtn = page.getByTestId('save-draft-btn');
    if (await saveDraftBtn.isVisible()) {
      await saveDraftBtn.click();
    }

    // 4. Hard reload the page
    await page.reload();

    // 5. Verify restored values
    await expect(page.getByTestId('product-name-input')).toHaveValue('Drafted Linen Summer Shirt');
    await expect(page.getByTestId('product-brand-input')).toHaveValue('Celebs Resort');
  });
});
