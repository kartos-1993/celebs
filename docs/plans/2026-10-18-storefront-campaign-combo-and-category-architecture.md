# Architecture & Implementation Blueprint — Storefront Browse, Festival Campaigns, Combo Bundles & Tag Deprecation

**Date:** 2026-10-18  
**Author:** Antigravity Engineering (Senior Staff / Pair Agent)  
**Status:** Approved for Implementation  
**Target Audience:** Autonomous Implementation Agent  
**Scope:** `apps/api`, `apps/mobile`, `apps/web-admin`, `packages/shared-types`, PostgreSQL Database  
**Mandate Compliance:** Clean Architecture, Port 6543 Pool Preservation, TDD-First, FSD File Budget (≤ 150 lines/tsx), Zero UI apiClient mutations.

---

## 1. Executive Summary & Forensic Truth

This document is the authoritative, comprehensive implementation specification for unifying category browsing, festival campaigns, combo bundle packs, and cart pricing across the Celebs platform.

### 1.1 The 6 Critical Findings Verified in Code & Database

1. **Unapplied Migration & Table Name Drift:**
   - In `schema.prisma:1482`, the model is named `StorefrontShortcut`.
   - Migration `20261016143545_rename_quick_filter_to_storefront_shortcut` was created but **never deployed to PostgreSQL**.
   - The live database table is still `QuickFilter` (0 rows). Calling `StorefrontShortcutRepository` directly throws PostgreSQL relation errors.
2. **The "Tag" Conflation Catastrophe (F1, P0):**
   - Mobile `use-category-filters.ts` hardcoded `filterParams.tag = selectedStorefrontShortcutValue`.
   - For subcategory chips (e.g. "Men Denim"), it sent `tag=men-denim`.
   - The API ran `tags @> ARRAY['men-denim']`.
   - In `Product.tags`, tags are marketing strings (`['denim', 'jeans', 'menswear']`), never category slugs.
   - **Result:** 90%+ of all category shortcut chips returned **0 items**, hiding 22+ active products.
3. **Ghost Models (0 Campaigns, 0 Combos):**
   - Verified via Postgres MCP: `Campaign` (0 rows), `CampaignProduct` (0 rows), `ComboBundle` (0 rows), `ComboBundleItem` (0 rows).
   - No seed scripts existed for campaigns or combos.
4. **Broken Mobile UX Plaguing the Homepage:**
   - When `combos.length === 0`, `ComboBundleShowcase` renders a broken card: _"No bundles to show. Tap to try again"_. Tapping it refetches and shows the exact same broken card.
   - `CampaignCountdownBanner` returns `null` or renders a "Shop Now" button with **no `onPress` handler**.
   - Mobile has **no campaign screen route** (`app/campaign/[slug].tsx`).
   - `HomeScreen` (`app/(tabs)/index.tsx`) renders `ComboBundleModal` **without passing `onAddToCart`**, making the modal completely inert.
5. **FlashList Asymmetric Grid Defect (F2, P1):**
   - `category.styles.ts` has an unused `columnWrapper` style with `paddingHorizontal: 12`.
   - FlashList does not support `columnWrapperStyle`.
   - `listContent` has zero horizontal padding.
   - Result: Cards touch the left screen edge (0px gutter) with an awkward 15px right gap.
6. **Database Connection Pool Exhaustion (Port 6543):**
   - Public storefront infinite-scroll queries run `count(*)` on page 1, which the mobile app completely ignores (`ThemedText` renders `products.length`).
   - Category filtering uses `OR: [{ categoryId: in }, { subcategoryId: in }]` which disables index ordering along `createdAt DESC`, forcing in-memory `Bitmap Heap Scan + Sort`.

---

## 2. Definitive Architectural Decisions

### Decision 1: Deprecate & Drop `Product.tags` (Ponytail / YAGNI Mandate)

- **Why:** Vendors cannot input tags in `web-admin` (no form field exists). Mobile never renders tags. Category taxonomy belongs in `Category`. Specifications belong in `dynamicData`. Marketing promotions belong in `Campaign` and `ComboBundle`. The unindexed array check `tags @> ARRAY[term]` wasted PostgreSQL CPU and broke search.
- **Action:** Drop `tags` column from `Product`, remove `tag` from `productFilterSchema`, remove `tags` from `createProductSchema`.

### Decision 2: Single Source of Truth for Product Listing

- All product browsing (category, subcategory, festival campaign, search) routes through **one single endpoint**:
  ```http
  GET /products?category=<slug>&subcategory=<slug>&campaign=<slug>&search=<q>
  ```
  `ProductQueryService` remains the sole authority for pagination, cursor encoding, projections, and Redis caching.

### Decision 3: First-Class Combo Architecture (Inspired by Daraz & Shein)

- Combos are **not** fake product rows. They remain first-class aggregates in `ComboBundle`.
- Combos are served via `GET /combos?category=<slug>`.
- In the mobile 2-column feed, a dedicated `ComboProductCard` renders inline, matching `CARD_WIDTH`, with a split dual-thumbnail collage and instant "Customize & Add" modal.
- Cart insertion uses an atomic batch endpoint `POST /cart/combos`. Physical inventory items are inserted into `CartItem` with `comboBundleId` set and `appliedDiscount` prorated.

### Decision 4: Festival Campaign Integration

- Active campaigns display an urgent countdown hero banner on the homepage.
- Tapping routes to `/campaign/[slug]`, which renders the campaign hub and its enrolled product feed.
- Enrolled products in standard category feeds display a high-contrast badge: `[🎉 DASHAIN SALE: 20% OFF]`.

---

## 3. Database & Schema Specifications

All DDL migrations **must** run against `DIRECT_URL` (Port 5432) per [`prisma-cli`](file:///c:/celebs/celebs/.agents/skills/prisma-cli/SKILL.md).

### 3.1 Migration 1: Deploy Pending Rename

Run pending migration to sync the database with `schema.prisma`:

```bash
npx prisma migrate deploy
```

- Table `QuickFilter` is renamed to `StorefrontShortcut`.

### 3.2 Migration 2: Drop Tags & Add Composite Covering Indexes

Create migration `drop_product_tags_and_add_browse_indexes`:

```sql
-- 1. Drop dead tags column from Product
ALTER TABLE "Product" DROP COLUMN IF EXISTS "tags";

-- 2. Add composite covering index for category browse with cursor sort
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Product_status_categoryId_createdAt_id_idx"
  ON "Product" (status, "categoryId", "createdAt" DESC, id DESC);

-- 3. Add composite covering index for subcategory browse with cursor sort
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Product_status_subcategoryId_createdAt_id_idx"
  ON "Product" (status, "subcategoryId", "createdAt" DESC, id DESC);

-- 4. Add index for fast CampaignProduct seeks
CREATE INDEX CONCURRENTLY IF NOT EXISTS "CampaignProduct_campaignId_productId_idx"
  ON "CampaignProduct" ("campaignId", "productId");
```

---

## 4. Shared Contracts (`packages/shared-types`)

### 4.1 Update [`product.validator.ts`](file:///c:/celebs/celebs/packages/shared-types/src/validators/product.validator.ts)

```typescript
export const productFilterSchema = z.object({
  search: z.string().optional(),
  categoryId: idSchema.optional(),
  subcategoryId: idSchema.optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(), // Child category slug or ID
  campaign: z.string().optional(), // Active festival campaign slug
  brandId: idSchema.optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  status: z
    .enum(['draft', 'pending_review', 'published', 'rejected', 'deactivated', 'archived'])
    .optional(),
  featured: z.boolean().optional(),
  vendorId: z.string().optional(),
  cursor: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_.-]+$/, 'Invalid cursor format')
    .optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.enum(['createdAt', 'price', 'name']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type ProductFilterType = z.infer<typeof productFilterSchema>;
```

- Remove `tags` from `createProductSchema` and `updateProductSchema`.

### 4.2 Update [`cart.validator.ts`](file:///c:/celebs/celebs/packages/shared-types/src/validators/cart.validator.ts)

Add the atomic combo bundle add-to-cart contract:

```typescript
export const addComboToCartSchema = z.object({
  comboBundleId: idSchema,
  items: z
    .array(
      z.object({
        productId: idSchema,
        colorVariantName: z.string().min(1, 'Color variant is required'),
        size: z.string().min(1, 'Size is required'),
        quantity: z.number().int().positive().default(1),
      }),
    )
    .min(1, 'A combo bundle must contain at least one item'),
});

export type AddComboToCartInput = z.infer<typeof addComboToCartSchema>;
```

---

## 5. Backend Implementation (`apps/api`)

### 5.1 Update [`ProductQueryService`](file:///c:/celebs/celebs/apps/api/src/modules/product/product-query.service.ts)

#### 1. Implement `subcategory` and `campaign` resolution:

```typescript
private async applyCategoryFilters(
  filters: ProductFilterType,
  andClauses: Prisma.ProductWhereInput[],
): Promise<void> {
  // 1. Parent Category filter
  if (filters.category) {
    const categoryDoc = await this.categories.findFilterMatch(filters.category.trim());
    if (categoryDoc) {
      const descendantIds = await this.categories.findDescendantIds(categoryDoc.id, categoryDoc.slug);
      const allMatchingIds = [categoryDoc.id, ...descendantIds];
      andClauses.push({
        OR: [
          { categoryId: { in: allMatchingIds } },
          { subcategoryId: { in: allMatchingIds } },
        ],
      });
    }
  }

  // 2. Subcategory filter (from shortcut chips or drawer)
  if (filters.subcategory) {
    const subcatDoc = await this.categories.findFilterMatch(filters.subcategory.trim());
    if (subcatDoc) {
      const descendantIds = await this.categories.findDescendantIds(subcatDoc.id, subcatDoc.slug);
      const subMatchingIds = [subcatDoc.id, ...descendantIds];
      andClauses.push({
        OR: [
          { categoryId: { in: subMatchingIds } },
          { subcategoryId: { in: subMatchingIds } },
        ],
      });
    }
  }

  // 3. Festival Campaign filter
  if (filters.campaign) {
    const campaign = await this.campaignRepo.findBySlug(filters.campaign.trim());
    if (campaign && campaign.isActive) {
      const productIds = (campaign.products || []).map((p) => p.productId);
      andClauses.push({ id: { in: productIds } });
    } else {
      // Non-existent or inactive campaign returns empty list
      andClauses.push({ id: '__never_match__' });
    }
  }
}
```

#### 2. Connection Pool Preservation: Skip `count(*)` on public storefront browse:

```typescript
// Public storefront browsing uses infinite scroll and client loaded count; omit full table count(*)
const shouldCalculateTotal = opts.isElevated || (!isPublicScope && !isCursorMode);

const [rawProducts, totalCount] = await Promise.all([
  this.products.findManyList(findOptions),
  shouldCalculateTotal ? this.products.count(where) : Promise.resolve(undefined),
]);
```

#### 3. Attach Campaign Badge in [`product-response-shapes.ts`](file:///c:/celebs/celebs/apps/api/src/modules/product/product-response-shapes.ts):

```typescript
export function formatStorefrontCard(
  product: FormattedProduct,
  activeCampaignMap?: Map<string, { title: string; themeColor: string; discountText: string }>,
): StorefrontCard {
  const campaignBadge = activeCampaignMap?.get(product.id);
  return {
    ...baseCard,
    campaignBadge,
  };
}
```

### 5.2 Implement Atomic Combo Cart in [`CartService`](file:///c:/celebs/celebs/apps/api/src/modules/cart/cart.service.ts)

Add method `addComboToCart(userId, sessionId, input: AddComboToCartInput)`:

```typescript
static async addComboToCart(
  userId: string | undefined,
  sessionId: string | undefined,
  input: AddComboToCartInput,
): Promise<CartResponse> {
  const { comboBundleId, items } = input;

  const bundle = await prisma.comboBundle.findUnique({
    where: { id: comboBundleId },
    include: { items: true },
  });

  if (!bundle || !bundle.isActive) {
    throw new AppError('Combo bundle not found or inactive', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
  }

  const cartRecord = await this.getOrCreateCartRecord(userId, sessionId);

  // Compute discount per item:
  // If percentage: each item gets discountValue % off
  // If fixed amount: total fixed discount is prorated equally across items
  const isPercentage = bundle.discountType === 'PERCENTAGE';
  const perItemFixedDiscount = isPercentage
    ? null
    : new Prisma.Decimal(bundle.discountValue).div(items.length);

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      // Resolve inventory ID
      const inventory = await InventoryService.findOrCreateInventory(
        item.productId,
        item.colorVariantName,
        item.size,
      );

      const product = await tx.product.findUniqueOrThrow({
        where: { id: item.productId },
        select: { price: true },
      });

      const appliedDiscount = isPercentage
        ? new Prisma.Decimal(product.price).mul(new Prisma.Decimal(bundle.discountValue).div(100))
        : perItemFixedDiscount!;

      await tx.cartItem.upsert({
        where: { cartId_inventoryId: { cartId: cartRecord.id, inventoryId: inventory.inventoryId } },
        create: {
          cartId: cartRecord.id,
          inventoryId: inventory.inventoryId,
          quantity: item.quantity,
          comboBundleId: bundle.id,
          appliedDiscount,
          discountSource: `COMBO:${bundle.slug}`,
        },
        update: {
          quantity: { increment: item.quantity },
          comboBundleId: bundle.id,
          appliedDiscount,
          discountSource: `COMBO:${bundle.slug}`,
        },
      });
    }
  });

  return this.getCart(userId, sessionId);
}
```

- In `CartService.getCart`, project `appliedDiscount` and calculate:
  ```ts
  const price = item.appliedDiscount
    ? Math.max(0, rawPrice - Number(item.appliedDiscount))
    : rawDiscounted || rawPrice;
  ```

### 5.3 Cache & Surface Storefront Config in [`StorefrontShortcutService`](file:///c:/celebs/celebs/apps/api/src/modules/storefront-shortcut/storefront-shortcut.service.ts)

- Cache the result of `getStorefrontConfigBySlug` in Redis (`category:storefront:${slug}`, TTL: 300s).
- Set HTTP header `Cache-Control: public, max-age=60, stale-while-revalidate=300`.
- Preserve `title: qf.title || 'Subcategories'` in shortcut output.
- Filter shortcuts by `isActive: true`.

---

## 6. Mobile Implementation (`apps/mobile`)

### 6.1 Fix FlashList Grid Layout in [`category.styles.ts`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/styles/category.styles.ts)

1. Delete the dead `columnWrapper` style.
2. Update `listContent`:
   ```typescript
   listContent: {
     paddingHorizontal: Spacing.md, // 12px margins left & right
     paddingVertical: Spacing.md,
   },
   ```

### 6.2 Update [`useCategoryFilters.ts`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/hooks/use-category-filters.ts)

Stop sending shortcut selections as `tag`. Support typed shortcuts:

```typescript
interface ActiveShortcut {
  value: string;
  type: StorefrontShortcutType;
}

export function useCategoryFilters(categorySlug: string) {
  const [selectedShortcut, setSelectedShortcut] = useState<ActiveShortcut | null>(null);

  const handleSelectStorefrontShortcutItem = useCallback(
    (item: StorefrontShortcutItem, type: StorefrontShortcutType = 'subcategory') => {
      const val = item.filterValue || item.slug || item.name;
      setSelectedShortcut((prev) => (prev?.value === val ? null : { value: val, type }));
    },
    [],
  );

  const filterParams: ProductFilterParams = useMemo(
    () => ({
      limit: 20,
      category: categorySlug,
      search: searchQuery.trim() || undefined,
      minPrice: selectedPriceRange?.min,
      maxPrice: selectedPriceRange?.max,
      subcategory: selectedShortcut?.type === 'subcategory' ? selectedShortcut.value : undefined,
      campaign: selectedShortcut?.type === 'collection' ? selectedShortcut.value : undefined,
    }),
    [categorySlug, searchQuery, selectedPriceRange, selectedShortcut],
  );
  // ...
}
```

### 6.3 Debounce Search Keystrokes in [`CategorySearchHeader`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/components/category-search-header.tsx)

Add 300ms debounce before invoking `onSearchChange`:

```tsx
const [localText, setLocalText] = useState(searchQuery);

useEffect(() => {
  const timer = setTimeout(() => {
    onSearchChange(localText);
  }, 300);
  return () => clearTimeout(timer);
}, [localText, onSearchChange]);
```

### 6.4 Build Inline `ComboProductCard` ([`combo-product-card.tsx`](file:///c:/celebs/celebs/apps/mobile/src/features/home/components/combo-product-card.tsx))

- Strictly under 150 lines.
- Adheres to `width: CARD_WIDTH`.
- Renders split dual-image collage + bundle badge (`SAVE %`) + "Customize & Add" button.
- Tapping calls `onSelectCombo(combo)`, opening `ComboBundleModal`.

### 6.5 Wire Cart Insertion in [`HomeScreen`](file:///c:/celebs/celebs/apps/mobile/src/app/%28tabs%29/index.tsx)

Pass `onAddToCart` to `ComboBundleModal`:

```tsx
const addComboMutation = useAddComboToCart();

const handleAddComboToCart = useCallback(
  async (combo: ComboBundleData, selectedVariants: ComboSelectedVariants) => {
    const items = Object.entries(selectedVariants).map(([productId, variant]) => ({
      productId,
      size: variant.size || 'M',
      colorVariantName: variant.color || 'Standard',
      quantity: 1,
    }));

    await addComboMutation.mutateAsync({
      comboBundleId: combo.id,
      items,
    });
    openCartSheet();
  },
  [addComboMutation, openCartSheet],
);

// In JSX:
<ComboBundleModal
  visible={isComboModalOpen}
  combo={selectedCombo}
  onClose={() => setIsComboModalOpen(false)}
  onAddToCart={handleAddComboToCart}
/>;
```

### 6.6 Build Campaign Destination Screen ([`apps/mobile/src/app/campaign/[slug].tsx`](file:///c:/celebs/celebs/apps/mobile/src/app/campaign/%5Bslug%5D.tsx))

- Under 150 lines.
- Header: Back button, Cart button, Festival Campaign Title + Live Countdown timer.
- Body: Hero banner + 2-column FlashList using `useProducts({ campaign: slug })`.
- Wire the `CampaignCountdownBanner` button in `HomeScreen`:
  ```ts
  router.navigate({ pathname: '/campaign/[slug]', params: { slug: campaign.slug } });
  ```

---

## 7. High-Quality Seed Data Implementation

Create two new executable seed scripts in `apps/api/src/db/seed/`:

### 7.1 [`seed-campaigns.ts`](file:///c:/celebs/celebs/apps/api/src/db/seed/seed-campaigns.ts)

Seeds two realistic Nepali festival campaigns linked to active published products:

1. **Dashain Festive Dhamaka** (`dashain-festive-dhamaka`):
   - Theme: `#D92525` (Crimson).
   - 8 published products (Hoodies, Coach Jackets, Jeans).
   - 20% discount override.
2. **Tihar Lights Sale** (`tihar-lights-sale`):
   - Theme: `#D97706` (Festive Gold).
   - 6 published products.

### 7.2 [`seed-combos.ts`](file:///c:/celebs/celebs/apps/api/src/db/seed/seed-combos.ts)

Seeds 4 curated streetwear bundles:

1. **Streetwear Duo:** Coach Jacket + Baggy Cargo Jeans (25% OFF).
2. **Denim On Denim:** Flap Pocket Denim Jacket + Straight Leg Jeans (NPR 1,000 OFF).
3. **Winter Commuter Pack:** Stand Collar Windbreaker + Ash Grey Cargo (NPR 800 OFF).
4. **Minimalist Set:** Suede Jacket + Denim Pants (20% OFF).

Register both in `apps/api/src/db/seed/index.ts`.

---

## 8. Test-Driven Verification Protocol (TDD)

Every requirement **must** have a failing test committed before writing application code.

| Phase             | Test File                         | Requirement Under Test                                                                                             |
| :---------------- | :-------------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| **Contracts**     | `product.validator.spec.ts`       | Validates `subcategory` and `campaign` strings; rejects removed `tag`.                                             |
| **Cart**          | `cart.validator.spec.ts`          | Validates `addComboToCartSchema` with multiple inventory items.                                                    |
| **API Browse**    | `product-query.service.spec.ts`   | Confirms querying `subcategory=men-denim` returns **22 products**; confirms `count(*)` is omitted in public scope. |
| **Cart Service**  | `cart.service.spec.ts`            | Confirms adding a combo writes `combo_bundle_id` and prorates `applied_discount`.                                  |
| **Mobile Hook**   | `use-category-filters.spec.ts`    | Confirms selecting a subcategory shortcut populates `filterParams.subcategory`.                                    |
| **Mobile Search** | `category-search-header.spec.tsx` | Confirms 300ms debounce prevents keystroke flooding.                                                               |
| **Database Plan** | PostgreSQL MCP `explain_query`    | Confirms category browse query switches from `Bitmap Heap Scan + Sort` to direct `Index Scan`.                     |

---

### Implementation Ready

Any autonomous agent reading this document has the full architectural context, exact file locations, database mandates, and implementation code blocks required to execute the task cleanly without creating architectural slop.
