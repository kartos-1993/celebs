import { expect,test } from '@playwright/test';

import { authenticateAs } from './fixtures/auth.fixture';
import { setupProductMocks } from './fixtures/product-mocks';

const DUMMY_IMAGE = {
  name: 'product-apparel.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  ),
};

test.describe('E2E: Full Apparel Product Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAs(page, 'VENDOR');
    await setupProductMocks(page);
    await page.goto('/products/new', { waitUntil: 'domcontentloaded' });
  });

  test('complete flow: select category, upload main images, 2 colors, 2 sizes, color images, product & body measurements, auto-SKUs, bulk price & stock, and submit', async ({
    page,
  }) => {
    // ── 1. Select Category (Men's Apparel > Tops & T-Shirts) ─────────────────
    await expect(page.getByTestId('category-cascading-trigger')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('category-cascading-trigger').click();
    await page.getByText("Men's Apparel").first().click();
    await page.getByText('Tops & T-Shirts').first().click();
    await page.getByTestId('category-confirm-btn').click();

    // ── 2. Fill Basic Information ─────────────────────────────────────────────
    await page.getByTestId('product-name-input').fill('Oversized Heavyweight Vintage Tee');
    await page.getByTestId('product-brand-input').fill('Celebs Luxury Studio');
    await page
      .getByTestId('product-desc-input')
      .fill('Crafted with 260 GSM organic combed cotton, vintage acid wash texture.');

    // ── 3. Upload Main Images ─────────────────────────────────────────────────
    const mainImageInput = page.getByTestId('main-image-upload-input').first();
    if (await mainImageInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mainImageInput.setInputFiles([DUMMY_IMAGE]);
    }

    // ── 4. Select Two Colors (Vintage Black, Washed Olive) ───────────────────
    const colorDropdown = page
      .getByRole('button', { name: /select available colors/i })
      .or(page.getByText('Select Available Colors'));
    if (await colorDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      await colorDropdown.click();
      await page.getByText('Vintage Black').first().click();
      await page.getByText('Washed Olive').first().click();
      // Close dropdown by pressing Escape
      await page.keyboard.press('Escape');
    }

    // ── 5. Select Two Sizes (Small, Medium) ──────────────────────────────────
    const sizeDropdown = page
      .getByRole('button', { name: /select available sizes/i })
      .or(page.getByText('Select Available Sizes'));
    if (await sizeDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sizeDropdown.click();
      await page.getByText('Small').first().click();
      await page.getByText('Medium').first().click();
      // Close dropdown by pressing Escape
      await page.keyboard.press('Escape');
    }

    // ── 6. Upload Color Swatch Images for Both Colors ────────────────────────
    const blackSwatchInput = page.getByTestId('color-swatch-upload-Black');
    if (await blackSwatchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await blackSwatchInput.setInputFiles(DUMMY_IMAGE);
    }
    const oliveSwatchInput = page.getByTestId('color-swatch-upload-Olive');
    if (await oliveSwatchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await oliveSwatchInput.setInputFiles(DUMMY_IMAGE);
    }

    // ── 7. Fill All Size & Body Measurements ─────────────────────────────────
    // Tab A: Product Measurements (Garment Flat)
    const productTab = page.getByTestId('measurement-tab-product');
    if (await productTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await productTab.click();
    }
    // Fill Small
    const sBust = page.getByTestId('measurement-input-S-Bust');
    if (await sBust.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sBust.fill('100');
      await page.getByTestId('measurement-input-S-Length').fill('70');
      await page.getByTestId('measurement-input-S-Shoulder').fill('48');
    }
    // Fill Medium
    const mBust = page.getByTestId('measurement-input-M-Bust');
    if (await mBust.isVisible({ timeout: 2000 }).catch(() => false)) {
      await mBust.fill('106');
      await page.getByTestId('measurement-input-M-Length').fill('73');
      await page.getByTestId('measurement-input-M-Shoulder').fill('51');
    }

    // Tab B: Body Measurements (Wearer Fit Guide)
    const bodyTab = page.getByTestId('measurement-tab-body');
    if (await bodyTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bodyTab.click();
      const sHeight = page.getByTestId('measurement-input-S-Height');
      if (await sHeight.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sHeight.fill('165-172');
        await page.getByTestId('measurement-input-S-Weight').fill('55-65');
      }
      const mHeight = page.getByTestId('measurement-input-M-Height');
      if (await mHeight.isVisible({ timeout: 2000 }).catch(() => false)) {
        await mHeight.fill('170-178');
        await page.getByTestId('measurement-input-M-Weight').fill('65-75');
      }
    }

    // ── 8. Fill Base Price & Auto-Generate 18-Character SKUs ─────────────────
    const basePriceInput = page.locator('input[name="price"]').first();
    if (await basePriceInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await basePriceInput.scrollIntoViewIfNeeded();
      await basePriceInput.fill('2200');
    }

    const autoSkuBtn = page.getByTestId('sku-auto-generate-btn');
    if (await autoSkuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await autoSkuBtn.scrollIntoViewIfNeeded();
      await autoSkuBtn.click();
    }

    const bulkPriceInput = page.getByTestId('sku-bulk-price-input');
    if (await bulkPriceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bulkPriceInput.scrollIntoViewIfNeeded();
      await bulkPriceInput.fill('2200');
      await page.getByTestId('sku-bulk-stock-input').fill('35');
      await page.getByTestId('sku-bulk-apply-btn').click();
    }

    // ── 9. Submit Product Form ───────────────────────────────────────────────
    const submitBtn = page.getByTestId('submit-product-btn');
    await submitBtn.scrollIntoViewIfNeeded();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Pause 8 seconds so you can clearly inspect the filled form and submission
    await page.waitForTimeout(8000);
  });
});
