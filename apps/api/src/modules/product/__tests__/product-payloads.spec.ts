import { describe, expect, it } from 'vitest';

import { updateProductSchema } from '@celebs/shared-types';

import { buildProductCreateData, buildProductUpdateData } from '../product-payloads';

// The fixtures deliberately violate the zod input (non-UUID category ids) to
// exercise the builders' trim/presence mapping, so each is asserted past its
// static type. Typed at the declaration (not `as never` on the const) so the
// per-test `{ ...fixture, field }` spreads below still resolve as objects.
const baseCreateInput: Parameters<typeof buildProductCreateData>[0] = {
  name: '  Denim Jacket  ',
  description: '  A sturdy jacket.  ',
  price: 2500,
  discountedPrice: 2000,
  categoryId: 'cat-1',
  subcategoryId: 'sub-1',
  colorVariants: [],
  skus: [],
  variantOptions: [],
  mainImages: [],
  dynamicData: {},
  tags: ['denim'],
  featured: false,
  status: 'draft',
} as never;

const createOpts = {
  slug: 'denim-jacket-abc',
  categoryId: 'cat-1',
  subcategoryId: 'sub-1',
  brandId: 'brand-1',
  brandName: 'Celebs',
  userId: 'user-1',
  vendorId: 'vendor-1',
  vendorName: 'Celebs Official',
};

const fakeProduct: Parameters<typeof buildProductUpdateData>[0] = {
  id: 'p1',
  name: 'Denim Jacket',
  slug: 'denim-jacket-old',
  description: 'Old description',
  price: 2500,
  discountedPrice: 2000,
  categoryId: 'cat-1',
  subcategoryId: 'sub-1',
  brandId: 'brand-1',
  brand: 'Celebs',
  status: 'draft',
  vendorId: 'vendor-1',
  reviewHistory: [],
} as never;

const updateOpts = {
  slug: 'denim-jacket-old',
  resolvedCategoryId: 'cat-1',
  resolvedSubcategoryId: 'sub-1',
  resolvedBrandId: 'brand-1',
  resolvedBrandName: 'Celebs',
  userId: 'user-1',
  role: 'SUPERADMIN',
  crossStoreEdit: false,
  auditChanges: [],
};

describe('product payload builders', () => {
  describe('buildProductCreateData', () => {
    it('trims name/description and applies brand, slug, ownership and shipping defaults', () => {
      const data = buildProductCreateData(baseCreateInput, createOpts);
      expect(data).toMatchObject({
        name: 'Denim Jacket',
        description: 'A sturdy jacket.',
        slug: 'denim-jacket-abc',
        brand: 'Celebs',
        brandId: 'brand-1',
        price: 2500,
        discountedPrice: 2000,
        categoryId: 'cat-1',
        subcategoryId: 'sub-1',
        createdBy: 'user-1',
        updatedBy: 'user-1',
      });
      expect(data.packageWeightKg).toBe(0.3);
      expect(data.packagingType).toBe('FLYER_SMALL');
      expect(data.isFragile).toBe(false);
    });

    it('falls back description to empty string when missing/blank', () => {
      const data = buildProductCreateData(
        { ...baseCreateInput, description: '   ' } as never,
        createOpts,
      );
      expect(data.description).toBe('');
    });

    it('omits brand/vendor keys when null (Prisma undefined = untouched)', () => {
      const data = buildProductCreateData(baseCreateInput, {
        ...createOpts,
        brandId: null,
        brandName: null,
        vendorId: null,
        vendorName: undefined,
      });
      expect(data.brand).toBeUndefined();
      expect(data.brandId).toBeUndefined();
      expect(data.vendorId).toBeUndefined();
      expect(data.vendorName).toBeUndefined();
    });
  });

  describe('buildProductUpdateData — presence checks (!== undefined)', () => {
    it('emits trimmed name and price when present', () => {
      const data = buildProductUpdateData(
        fakeProduct,
        { name: '  New Name  ', price: 3000 } as never,
        updateOpts,
      );
      expect(data).toMatchObject({ name: 'New Name', price: 3000 });
    });

    it('emits name:"" — the truthy guard is dead code, presence is the contract', () => {
      // Zod already rejects "" upstream (see the "Zod boundary" block below), so
      // the old `updateData.name ? ...` guard could only ever silently drop a
      // value the schema had already refused. `!== undefined` is the honest
      // presence check and matches pickDefined().
      const data = buildProductUpdateData(fakeProduct, { name: '' } as never, updateOpts);
      expect(data).toHaveProperty('name', '');
    });

    it('emits price:0 — zero is a real value, not an absent one', () => {
      // `...(updateData.price ? ...)` dropped 0. Zod rejects price:0 upstream
      // ("Price must be positive"), so 0 can never arrive from a validated
      // request; the builder now forwards presence faithfully.
      const data = buildProductUpdateData(fakeProduct, { price: 0 } as never, updateOpts);
      expect(data).toHaveProperty('price', 0);
    });

    it('omits name/price only when genuinely absent (undefined)', () => {
      const data = buildProductUpdateData(fakeProduct, {} as never, updateOpts);
      expect(data).not.toHaveProperty('name');
      expect(data).not.toHaveProperty('price');
    });

    it('passes discountedPrice through on !== undefined — including null (clears discount)', () => {
      const nulled = buildProductUpdateData(
        fakeProduct,
        { discountedPrice: null } as never,
        updateOpts,
      );
      expect(nulled).toHaveProperty('discountedPrice', null);

      const omitted = buildProductUpdateData(fakeProduct, {} as never, updateOpts);
      expect(omitted).not.toHaveProperty('discountedPrice');
    });

    it('stays a pure mapper: emits a discount that exceeds the new price', () => {
      // No cross-check lives in the builder. The STORED-row comparison is a
      // service concern (ProductService.assertDiscountSafety) because only the
      // service holds the persisted row — see product-service-wiring.spec.ts.
      const data = buildProductUpdateData(
        { ...fakeProduct, discountedPrice: 2000 } as never,
        { price: 1500 } as never,
        updateOpts,
      );
      expect(data).toMatchObject({ price: 1500 });
      expect(data).not.toHaveProperty('discountedPrice');
    });

    it('pickDefined: copies shipping/warranty keys when defined — even false/0/null', () => {
      const data = buildProductUpdateData(
        fakeProduct,
        { isFragile: false, packageWeightKg: 0, warrantyPeriod: null } as never,
        updateOpts,
      );
      expect(data).toMatchObject({ isFragile: false, packageWeightKg: 0, warrantyPeriod: null });
    });

    it('pickDefined: skips keys that are undefined', () => {
      const data = buildProductUpdateData(fakeProduct, {} as never, updateOpts);
      expect(data).not.toHaveProperty('packageWeightKg');
      expect(data).not.toHaveProperty('isFragile');
    });

    it('always rewrites category/subcategory/slug/updatedBy; audit entry only with changes', () => {
      const data = buildProductUpdateData(fakeProduct, { tags: ['x'] } as never, updateOpts);
      expect(data).toMatchObject({
        categoryId: 'cat-1',
        subcategoryId: 'sub-1',
        slug: 'denim-jacket-old',
        updatedBy: 'user-1',
      });
      expect(data).not.toHaveProperty('reviewHistory');

      const withAudit = buildProductUpdateData(fakeProduct, { tags: ['x'] } as never, {
        ...updateOpts,
        auditChanges: [{ field: 'tags', from: '[]', to: '["x"]' }],
      });
      expect(withAudit).toHaveProperty('reviewHistory');
    });
  });

  // Evidence for the dead-guard removal above: the Zod boundary rejects both
  // values outright, so the removed truthiness guards were unreachable.
  describe('Zod boundary rejects the values the old guards used to swallow', () => {
    it('rejects name:"" and any name shorter than 2 chars after trimming', () => {
      for (const name of ['', '   ', 'a']) {
        const parsed = updateProductSchema.safeParse({ name });
        expect(parsed.success, `expected name=${JSON.stringify(name)} to be rejected`).toBe(false);
      }
      expect(updateProductSchema.safeParse({ name: 'ab' }).success).toBe(true);
    });

    it('rejects price:0 and negative prices', () => {
      for (const price of [0, -5]) {
        const parsed = updateProductSchema.safeParse({ price });
        expect(parsed.success, `expected price=${price} to be rejected`).toBe(false);
      }
      expect(updateProductSchema.safeParse({ price: 1 }).success).toBe(true);
    });

    it('leaves the discount refine payload-only (both-present only)', () => {
      // Both present -> refine fires.
      expect(updateProductSchema.safeParse({ price: 1500, discountedPrice: 2000 }).success).toBe(
        false,
      );
      // Discount alone -> refine cannot see the stored price, so it passes.
      // That gap is closed in the service against the stored row.
      expect(updateProductSchema.safeParse({ discountedPrice: 2000 }).success).toBe(true);
    });
  });
});
