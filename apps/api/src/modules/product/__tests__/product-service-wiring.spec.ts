import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '@/config/db.prisma';
import { InventoryRepository } from '@/modules/inventory/inventory.repository';
import { ProductService } from '@/modules/product/product.service';

vi.mock('@/common/services/redis-cache.service', () => ({
  getCachedJson: vi.fn().mockResolvedValue(null),
  setCachedJson: vi.fn().mockResolvedValue(undefined),
  invalidateCacheKey: vi.fn().mockResolvedValue(undefined),
  scanDelByPattern: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/modules/brand/brand.service', () => ({
  brandService: {
    assertVendorCanUseBrand: vi.fn().mockResolvedValue(undefined),
    screenProductForBrandHijacking: vi.fn().mockResolvedValue(undefined),
  },
  BrandService: class {},
}));

vi.mock('@/modules/media/media.repository', () => ({
  mediaRepository: {
    adjustUsageByUrls: vi.fn().mockResolvedValue(undefined),
    claimProductOwner: vi.fn().mockResolvedValue(undefined),
  },
  MediaRepository: class {},
}));

const draftProduct = {
  id: 'p1',
  name: 'Titanium Phone Pro',
  slug: 'titanium-old',
  description: 'Baseline phone.',
  price: 1200,
  discountedPrice: null,
  categoryId: 'cat-electronics-id',
  subcategoryId: 'sub-phones-id',
  brandId: null,
  brand: null,
  status: 'draft',
  vendorId: 'vendor-1',
  colorVariants: [],
  skus: [],
  variantOptions: [],
  mainImages: [],
  dynamicData: {},
  tags: [],
  featured: false,
  reviewHistory: [],
} as never;

const withProduct = (overrides: object) => ({ ...(draftProduct as object), ...overrides }) as never;

const fakeProducts = (overrides: Record<string, unknown> = {}) => {
  const product = (overrides.product as object) ?? {};
  const state = { transactionCalls: 0, failFirstWith: null as unknown };
  return {
    state,
    repo: {
      findById: vi.fn().mockImplementation(async () => withProduct(product)),
      existsBySlug: vi.fn().mockResolvedValue(false),
      create: vi.fn().mockImplementation((data: Record<string, unknown>) => ({
        ...(draftProduct as object),
        ...product,
        ...data,
        id: 'p-new',
      })),
      update: vi.fn().mockImplementation((_id: string, data: Record<string, unknown>) => ({
        ...(draftProduct as object),
        ...product,
        ...data,
        id: 'p1',
      })),
      // Runs the transaction BODY, then optionally fails — so a failure can be
      // observed from inside the body (where the SKU insert actually happens)
      // rather than before any statement executes.
      transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        state.transactionCalls += 1;
        if (state.failFirstWith && state.transactionCalls === 1) {
          // still run the body, then surface the injected error
          await fn({}).catch(() => undefined);
          throw state.failFirstWith;
        }
        return fn({});
      }),
      ...overrides,
    } as never,
  };
};

/**
 * A mocked repo member, for spy assertions. `repo` is `as never` because the
 * fixture is deliberately partial, so its members are unreachable by name;
 * reading through `unknown` keeps this a single cast.
 */
const repoMock = (repo: unknown, member: string): ReturnType<typeof vi.fn> =>
  (repo as Record<string, ReturnType<typeof vi.fn>>)[member] as ReturnType<typeof vi.fn>;

/** departmentHint is the 5th arg (index 4) of syncProductInventory. */
const hintOf = (spy: ReturnType<typeof vi.fn>, call = 0): unknown => spy.mock.calls[call]?.[4];

/** styleSalt is the 6th arg (index 5), under `options.styleSalt`. */
const saltOf = (spy: ReturnType<typeof vi.fn>, call: number): string | undefined =>
  (spy.mock.calls[call]?.[5] as { styleSalt?: string } | undefined as { styleSalt?: string })
    ?.styleSalt;

const skuP2002 = () =>
  new Prisma.PrismaClientKnownRequestError('sku collision', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['sku'] },
  });

const slugP2002 = () =>
  new Prisma.PrismaClientKnownRequestError('slug collision', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['slug'] },
  });

describe('product service wiring (mocked repos, no DB)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(InventoryRepository.prototype, 'syncProductInventory').mockResolvedValue(undefined);
    vi.spyOn(InventoryRepository.prototype, 'findInventoriesByProductId').mockResolvedValue([]);
  });

  describe('department hint (create/update parity)', () => {
    it('passes a real department NAME, never the category row id, on update', async () => {
      // The inventory layer feeds departmentHint into buildProductStyleRef,
      // which slices its first 4 characters. A row id ("cat-electronics-id")
      // produced category-id-shaped styleRefs ("CLB-CATE…") that never matched
      // create. With no resolvable category path (NODE_ENV=test short-circuit)
      // the hint falls back to the product name — same rule as create.
      const { repo } = fakeProducts();
      const service = new ProductService(repo);
      const syncSpy = InventoryRepository.prototype.syncProductInventory as unknown as ReturnType<
        typeof vi.fn
      >;

      await service.updateProduct(
        'p1',
        { colorVariants: [{ name: 'Red', stocks: [{ size: 'S', quantity: 1 }] }] } as never,
        'admin-1',
        'SUPERADMIN',
        undefined,
        ['PRODUCT_PUBLISH'],
      );

      expect(syncSpy).toHaveBeenCalledTimes(1);
      expect(syncSpy.mock.calls[0]?.[3]).toEqual([]);
      expect(hintOf(syncSpy)).toBe('Titanium Phone Pro');
      expect(hintOf(syncSpy)).not.toBe('cat-electronics-id');
    });

    it('create and update derive the SAME styleRef prefix for the same name', async () => {
      const { repo } = fakeProducts();
      const service = new ProductService(repo);
      const syncSpy = InventoryRepository.prototype.syncProductInventory as unknown as ReturnType<
        typeof vi.fn
      >;

      await service.createProduct(
        {
          name: 'Titanium Phone Pro',
          description: 'Same product, created.',
          price: 1200,
          categoryId: 'cat-electronics-id',
          subcategoryId: 'sub-phones-id',
          status: 'draft',
          colorVariants: [{ name: 'Red', stocks: [{ size: 'S', quantity: 1 }] }],
        } as never,
        'admin-1',
        'vendor-1',
        'Store',
        'SUPERADMIN',
      );

      await service.updateProduct(
        'p1',
        { colorVariants: [{ name: 'Red', stocks: [{ size: 'S', quantity: 1 }] }] } as never,
        'admin-1',
        'SUPERADMIN',
        undefined,
        ['PRODUCT_PUBLISH'],
      );

      const createHint = hintOf(syncSpy, 0) as string;
      const updateHint = hintOf(syncSpy, 1) as string;
      expect(createHint).toBe('Titanium Phone Pro');
      expect(updateHint).toBe(createHint);
      // Same prefix => same styleRef prefix, since styleRef is hint.slice(0, 4).
      expect(updateHint.slice(0, 4)).toBe(createHint.slice(0, 4));
    });

    it('follows a rename: the incoming name re-derives the hint, like create does', async () => {
      const { repo } = fakeProducts();
      const service = new ProductService(repo);
      const syncSpy = InventoryRepository.prototype.syncProductInventory as unknown as ReturnType<
        typeof vi.fn
      >;

      await service.updateProduct(
        'p1',
        {
          name: 'Cobalt Phone Max',
          colorVariants: [{ name: 'Red', stocks: [{ size: 'S', quantity: 1 }] }],
        } as never,
        'admin-1',
        'SUPERADMIN',
        undefined,
        ['PRODUCT_PUBLISH'],
      );

      expect(hintOf(syncSpy)).toBe('Cobalt Phone Max');
    });
  });

  describe('publish floor', () => {
    it('enforces the same zero-stock/image blockers on create and on update', async () => {
      // The floor used to run only in createProduct, so a draft could be flipped
      // straight to PUBLISHED with empty stocks and no photos.
      const { repo } = fakeProducts();
      const service = new ProductService(repo);
      const zeroStock = [{ name: 'Red', images: ['https://example.com/r.jpg'], stocks: [] }];

      await expect(
        service.createProduct(
          {
            name: 'Zero Stock Phone',
            description: 'No stock.',
            price: 1200,
            categoryId: 'cat-1',
            subcategoryId: 'sub-1',
            status: 'published',
            colorVariants: zeroStock,
          } as never,
          'admin-1',
          'vendor-1',
          'Store',
          'SUPERADMIN',
        ),
      ).rejects.toThrow(/Add at least 1 unit in one size to publish/);

      await expect(
        service.updateProduct(
          'p1',
          { status: 'published', colorVariants: [{ name: 'Red', stocks: [] }] } as never,
          'admin-1',
          'SUPERADMIN',
          undefined,
          ['PRODUCT_PUBLISH'],
        ),
      ).rejects.toThrow(/Add at least 1 unit in one size to publish/);
    });

    it('rejects a published transition whose variants carry no photos', async () => {
      const { repo } = fakeProducts();
      const service = new ProductService(repo);

      await expect(
        service.updateProduct(
          'p1',
          {
            status: 'published',
            colorVariants: [{ name: 'Red', images: [], stocks: [{ size: 'S', quantity: 4 }] }],
          } as never,
          'admin-1',
          'SUPERADMIN',
          undefined,
          ['PRODUCT_PUBLISH'],
        ),
      ).rejects.toThrow(/Add at least one product photo for color Red/);
    });

    it('attaches per-blocker details so the client can render a field list', async () => {
      const { repo } = fakeProducts();
      const service = new ProductService(repo);

      const err = await service
        .updateProduct(
          'p1',
          {
            status: 'published',
            colorVariants: [{ name: 'Red', images: [], stocks: [] }],
          } as never,
          'admin-1',
          'SUPERADMIN',
          undefined,
          ['PRODUCT_PUBLISH'],
        )
        .catch((e: unknown) => e as { details?: Array<{ field?: string; message: string }> });

      expect(err?.details).toEqual([
        { field: 'colorVariants', message: 'Add at least one product photo for color Red.' },
        { field: 'colorVariants', message: 'Add at least 1 unit in one size to publish.' },
      ]);
    });

    it('allows the transition when stock and photos are both present', async () => {
      const { repo } = fakeProducts();
      const service = new ProductService(repo);

      const updated = (await service.updateProduct(
        'p1',
        {
          status: 'published',
          colorVariants: [
            {
              name: 'Red',
              images: ['https://example.com/r.jpg'],
              stocks: [{ size: 'S', quantity: 2 }],
            },
          ],
        } as never,
        'admin-1',
        'SUPERADMIN',
        undefined,
        ['PRODUCT_PUBLISH'],
      )) as Record<string, unknown>;

      expect(updated.status).toBe('published');
    });

    it('does not re-apply the floor when the product is already published', async () => {
      const { repo } = fakeProducts({
        product: { status: 'published' },
      });
      const service = new ProductService(repo);

      // A pure text edit on a live product must not be blocked by the floor.
      const updated = (await service.updateProduct(
        'p1',
        { description: 'Copy tweak only' } as never,
        'admin-1',
        'SUPERADMIN',
        undefined,
        ['PRODUCT_PUBLISH'],
      )) as Record<string, unknown>;

      expect(updated.status).toBe('published');
    });

    it('a non-publisher downgrade to PENDING_REVIEW is not blocked by the floor', async () => {
      // A VENDOR-owned draft asking for PUBLISHED is downgraded before the
      // floor check, so the request must still succeed.
      const { repo } = fakeProducts();
      const service = new ProductService(repo);

      const updated = (await service.updateProduct(
        'p1',
        { status: 'published', colorVariants: [{ name: 'Red', stocks: [] }] } as never,
        'admin-1',
        'VENDOR',
        'vendor-1',
        [],
      )) as Record<string, unknown>;

      expect(updated.status).toBe('pending_review');
    });
  });

  describe('discount safety against the STORED row', () => {
    it('case 1/4 — both present: rejects discount >= incoming price', async () => {
      const { repo } = fakeProducts();
      const service = new ProductService(repo);
      await expect(
        service.updateProduct(
          'p1',
          { price: 1500, discountedPrice: 1500 } as never,
          'admin-1',
          'SUPERADMIN',
          undefined,
          ['PRODUCT_PUBLISH'],
        ),
      ).rejects.toThrow(/Discounted price must be less than the regular price/);
    });

    it('case 2/4 — price-only: rejects a price lowered under the STORED discount', async () => {
      // The hole: updateProductSchema.refine needs BOTH fields, so {price:1500}
      // against stored discountedPrice 2000 passed validation and left a stale
      // discount above the new price.
      const { repo } = fakeProducts({
        product: { price: 2500, discountedPrice: 2000 },
      });
      const service = new ProductService(repo);
      await expect(
        service.updateProduct('p1', { price: 1500 } as never, 'admin-1', 'SUPERADMIN', undefined, [
          'PRODUCT_PUBLISH',
        ]),
      ).rejects.toThrow(/Discounted price must be less than the regular price/);
    });

    it('case 3/4 — discount-only: rejects a discount raised to/over the STORED price', async () => {
      const { repo } = fakeProducts({ product: { price: 1200, discountedPrice: null } });
      const service = new ProductService(repo);
      await expect(
        service.updateProduct(
          'p1',
          { discountedPrice: 1200 } as never,
          'admin-1',
          'SUPERADMIN',
          undefined,
          ['PRODUCT_PUBLISH'],
        ),
      ).rejects.toThrow(/Discounted price must be less than the regular price/);
    });

    it('case 4/4 — neither present: an unpriced update is never rejected', async () => {
      // A no-op pricing write must not fail on pre-existing (legacy) bad data.
      const { repo } = fakeProducts({
        product: { price: 1000, discountedPrice: 5000 },
      });
      const service = new ProductService(repo);
      const updated = (await service.updateProduct(
        'p1',
        { description: 'No pricing change' } as never,
        'admin-1',
        'SUPERADMIN',
        undefined,
        ['PRODUCT_PUBLISH'],
      )) as Record<string, unknown>;
      expect(updated).toBeDefined();
    });

    it('accepts a valid merged pair and a cleared discount', async () => {
      const { repo } = fakeProducts({ product: { price: 2500, discountedPrice: 2000 } });
      const service = new ProductService(repo);

      await expect(
        service.updateProduct(
          'p1',
          { price: 1500, discountedPrice: 1499 } as never,
          'admin-1',
          'SUPERADMIN',
          undefined,
          ['PRODUCT_PUBLISH'],
        ),
      ).resolves.toBeDefined();

      await expect(
        service.updateProduct(
          'p1',
          { discountedPrice: null } as never,
          'admin-1',
          'SUPERADMIN',
          undefined,
          ['PRODUCT_PUBLISH'],
        ),
      ).resolves.toBeDefined();
    });

    it('rejects BEFORE any inventory sync or product write', async () => {
      const { repo } = fakeProducts({ product: { price: 2500, discountedPrice: 2000 } });
      const service = new ProductService(repo);
      const syncSpy = InventoryRepository.prototype.syncProductInventory as unknown as ReturnType<
        typeof vi.fn
      >;

      await expect(
        service.updateProduct(
          'p1',
          {
            price: 1500,
            colorVariants: [{ name: 'Red', stocks: [{ size: 'S', quantity: 1 }] }],
          } as never,
          'admin-1',
          'SUPERADMIN',
          undefined,
          ['PRODUCT_PUBLISH'],
        ),
      ).rejects.toThrow(/Discounted price must be less than the regular price/);

      expect(syncSpy).not.toHaveBeenCalled();
      expect(repoMock(repo, 'transaction')).not.toHaveBeenCalled();
    });

    it('carries field-level details for the client', async () => {
      const { repo } = fakeProducts({ product: { price: 2500, discountedPrice: 2000 } });
      const service = new ProductService(repo);
      const err = await service
        .updateProduct('p1', { price: 1500 } as never, 'admin-1', 'SUPERADMIN', undefined, [
          'PRODUCT_PUBLISH',
        ])
        .catch((e: unknown) => e as { details?: unknown });
      expect(err?.details).toEqual([
        {
          field: 'discountedPrice',
          message: 'Discounted price must be less than the regular price',
        },
      ]);
    });
  });

  describe('slug vs SKU conflict handling on create', () => {
    const createInput = {
      name: 'Retry Phone',
      description: 'Retry.',
      price: 1200,
      categoryId: 'cat-1',
      subcategoryId: 'sub-1',
      status: 'draft',
      colorVariants: [
        {
          name: 'Red',
          images: ['https://example.com/r.jpg'],
          stocks: [{ size: 'S', quantity: 1 }],
        },
      ],
    } as never;

    it('a SKU conflict regenerates the styleRef salt instead of replaying the same SKUs', async () => {
      // Previously every P2002 was treated as a slug collision, so an SKU
      // collision retried with a fresh slug and byte-identical generated SKUs.
      // The conflict is injected at the SKU insert (syncProductInventory), which
      // is where the duplicate key is actually raised.
      const { repo, state } = fakeProducts();
      vi.spyOn(InventoryRepository.prototype, 'syncProductInventory')
        .mockRejectedValueOnce(skuP2002())
        .mockResolvedValue(undefined);
      const service = new ProductService(repo);
      const syncSpy = InventoryRepository.prototype.syncProductInventory as unknown as ReturnType<
        typeof vi.fn
      >;

      const created = (await service.createProduct(
        createInput,
        'admin-1',
        'vendor-1',
        'Store',
        'SUPERADMIN',
      )) as Record<string, unknown>;

      expect(created).toBeDefined();
      expect(state.transactionCalls).toBe(2);
      expect(syncSpy).toHaveBeenCalledTimes(2);
      // Attempt 1 had no salt; the retry must carry a FRESH one.
      expect(saltOf(syncSpy, 0)).toBeUndefined();
      expect(saltOf(syncSpy, 1)).toMatch(/^[0-9A-Z]{4}$/);
    });

    it('a persistent SKU conflict surfaces a 400 with the field after the bounded retries', async () => {
      const { repo, state } = fakeProducts();
      vi.spyOn(InventoryRepository.prototype, 'syncProductInventory').mockRejectedValue(skuP2002());
      const service = new ProductService(repo);
      const syncSpy = InventoryRepository.prototype.syncProductInventory as unknown as ReturnType<
        typeof vi.fn
      >;

      const err = await service
        .createProduct(createInput, 'admin-1', 'vendor-1', 'Store', 'SUPERADMIN')
        .catch((e: unknown) => e as { statusCode?: number; details?: unknown });

      expect(err?.statusCode).toBe(400);
      expect(err?.details).toEqual([
        {
          field: 'skus',
          message: 'A record with this sku already exists. Please use a unique value.',
        },
      ]);
      // Bounded at 3 attempts, each minting a fresh salt after the first.
      expect(state.transactionCalls).toBe(3);
      expect(syncSpy).toHaveBeenCalledTimes(3);
      expect(saltOf(syncSpy, 0)).toBeUndefined();
      expect(saltOf(syncSpy, 1)).toMatch(/^[0-9A-Z]{4}$/);
      expect(saltOf(syncSpy, 2)).toMatch(/^[0-9A-Z]{4}$/);
      expect(saltOf(syncSpy, 1)).not.toBe(saltOf(syncSpy, 2));
    });

    it('a slug conflict retries with a fresh slug and does NOT churn the style salt', async () => {
      const { repo, state } = fakeProducts();
      vi.spyOn(InventoryRepository.prototype, 'syncProductInventory')
        .mockRejectedValueOnce(slugP2002())
        .mockResolvedValue(undefined);
      const service = new ProductService(repo);
      const syncSpy = InventoryRepository.prototype.syncProductInventory as unknown as ReturnType<
        typeof vi.fn
      >;

      await service.createProduct(createInput, 'admin-1', 'vendor-1', 'Store', 'SUPERADMIN');

      expect(state.transactionCalls).toBe(2);
      // The product insert precedes the inventory sync, so both attempts reach
      // it — and each must carry a DISTINCT slug, which is the point of the
      // retry (the SKU payload is replayed unchanged, hence no new salt).
      const slugs = repoMock(repo, 'create').mock.calls.map((c) => (c[0] as { slug: string }).slug);
      expect(slugs).toHaveLength(2);
      expect(slugs[0]).not.toBe(slugs[1]);
      // A slug retry must NOT invent a style salt: it re-runs the same payload.
      expect(saltOf(syncSpy, 0)).toBeUndefined();
      expect(saltOf(syncSpy, 1)).toBeUndefined();
    });

    it('a non-P2002 error is surfaced immediately with no retries', async () => {
      const { repo, state } = fakeProducts({
        state: null,
      });
      const service = new ProductService(repo);
      vi.spyOn(InventoryRepository.prototype, 'syncProductInventory').mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('fk', { code: 'P2003', clientVersion: 'test' }),
      );

      await expect(
        service.createProduct(createInput, 'admin-1', 'vendor-1', 'Store', 'SUPERADMIN'),
      ).rejects.toThrow(/fk/);
      expect(state.transactionCalls).toBe(1);
    });
  });
});
