# Audit — Mobile Category Browse Flow, Storefront Shortcuts & Search

**Branch:** `fix/auth-ux-and-shortcut-rename` @ `85c00758`
**Date:** 2026-10-17
**Mode:** Read-only audit. No source file was modified. This document is the sole artifact produced.
**Scope:** `apps/mobile` (home → category browse → filters → search) + `apps/api` (product query, storefront-shortcut, category resolution) + `packages/shared-types` (filter contracts) + seed data.
**Method:** codebase-memory graph (`search_graph`) → exact source reads → **live read-only queries + `EXPLAIN (ANALYZE, BUFFERS)` against the seeded dev DB** (36 products, 55 categories, 16 storefront shortcuts, Postgres 17.11 / Supabase) → FlashList library source for layout behavior.

**How to read this document.** The audit answers five questions, in order:

1. **Does tapping a category from the home screen work?** → §2
2. **Is the UI broken?** → §3
3. **Does the storefront shortcut row below the search bar work?** → §4
4. **Is the hot product read optimized?** → §5
5. **How far is search from shein.com?** → §6

§1 first explains how the whole flow is wired today, so every finding below has context. §7 covers verification and limitations, §8 is the prioritized fix list, and the appendix lists every file inspected.

---

## 0. Executive Summary

**In one paragraph:** the home tiles themselves navigate correctly and category lists do load (verified against live data: `men` → 36 products, `men-denim` → 22, `men-jeans` → 19). But three things turn that working skeleton into the experience you observed: **(a)** the storefront shortcut chips below the category search bar are functionally dead — they send a category slug as a product _tag_, and product tags almost never contain category slugs, so tapping most chips returns an empty list (e.g. "Men Denim" chip → 0 results although 22 products live there); **(b)** the category product grid has a real layout defect — it renders with zero page gutters and uneven spacing because the style that was supposed to provide them is a leftover from `FlatList` and FlashList ignores it; **(c)** the query backing all of it is not optimized for its dominant access pattern — every category browse and every search keystroke resolves to a backward scan of the `(status, createdAt)` index with a per-row filter, plus a `count(*)` on the first page, and there is no text index of any kind (no `pg_trgm`, no `tsvector`) for search.

| #       | Finding                                                                                                                                                                                                                                                            | Severity           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| **F1**  | **Storefront shortcut chips are functionally broken** — chip slug is sent as `tag`, matched with case-sensitive exact `tags @> ARRAY[slug]`. Live: `men` page → 1 of 9 chips returns any product; `men-denim` page → 0 of 4.                                       | **P0 High**        |
| **F2**  | **Category product grid layout is broken** — no page gutters, asymmetric 15px spacing, dead `columnWrapper` style (FlatList-only prop; FlashList enforces its own cell width).                                                                                     | **P1 High**        |
| **F3**  | **Filter drawer is decorative** — color/size/fit selections are collected but never sent to the API; `drawerFilters` from the API is always `[]` so hardcoded fallback options render; the filter badge counts toggles that do nothing.                            | **P1 High**        |
| **F4**  | **Hot read not optimized** — browse/search both run `Index Scan Backward on (status, createdAt)` + per-row Filter (category indexes unused); first page always adds `count(*)`; search `ILIKE '%term%'` has no index.                                              | **P1 High**        |
| **F5**  | **Search is far from shein.com** — substring `ILIKE` on name/brand + exact-case tag match; no FTS/trigram anywhere; no relevance ranking, no typo tolerance, no attribute search, **and no global search UI exists** (search lives only inside a category header). | **P1–P2**          |
| **F6**  | **One API query per keystroke** while typing in search (no debounce), each with its own Redis key + count + list — against a 300 req/min/IP limiter.                                                                                                               | **P1 Medium-High** |
| **F7**  | **Home grid quality** — root "Men" tile renders as a blank grey disc (no imageUrl); names are untrimmed (server names vs mobile-trimmed); empty categories (most of jewelry) dead-end on a blank screen with no empty state.                                       | **P2 Medium**      |
| **F8**  | **Inert UI** — sub-tabs (All/Women/Men/Kids/Curve/Home) only change highlight; home Menu and Heart buttons have no handlers; the category screen never displays the category title.                                                                                | **P2 Low-Med**     |
| **F9**  | **Shortcut presenter drops `title` and `isActive`** — chip rows have no "Subcategories" heading; admin-deactivated shortcuts still render; `/category/:slug/storefront` is uncached (3 DB queries per open).                                                       | **P3 Low**         |
| **F10** | **Silent list caps** — mobile caps at 80 items (4 pages × 20); "N Items Found" shows the loaded count, not the total; no "results capped" notice on the category screen.                                                                                           | **P3 Low**         |

---

## 1. How this flow is wired today — the system tour

This section explains the machinery so the findings make sense. All live numbers below were read from the seeded dev DB.

### 1.1 The category data model (and where products attach)

The catalog is a 3-level tree. On the men's side:

- **Level 1 (root):** `Men` (slug `men`) — no image.
- **Level 2 (groups):** nine children, e.g. `Men Denim` (`men-denim`), `Men Outerwear` (`men-outerwear`), `Men Tops` (`men-tops`), `Men Bottoms`, `Men Knitwear`, …
- **Level 3 (leaves):** e.g. `Men Denim Jackets`, `Men Jeans` (both under Men Denim), `Men Jackets & Coats` (under Men Outerwear).

Each product carries **two** category pointers (set by the seed, [`seed-products.ts`](file:///c:/celebs/celebs/apps/api/src/db/seed/seed-products.ts) lines 279–280):

```ts
categoryId: category.parentCategory ?? category.id, // the level-2 group
subcategoryId: category.id,                          // the level-3 leaf
```

So a pair of jeans physically lives at `subcategoryId = men-jeans` **and** `categoryId = men-denim`. That is why browsing either the group or the leaf can find it — and why the query has to test both columns (§5).

**Live distribution:** 36 published products across exactly 5 (group, leaf) pairs:

| Group (level 2)               | Leaf (level 3)          | Products |
| ----------------------------- | ----------------------- | -------- |
| `men-denim`                   | `men-denim-jackets`     | 3        |
| `men-denim`                   | `men-jeans`             | 19       |
| `men-hoodies-and-sweatshirts` | `men-hoodies`           | 3        |
| `men-outerwear`               | `men-jackets-and-coats` | 10       |
| `men-tops`                    | `men-t-shirts`          | 1        |

Everything else in the tree — the entire jewelry subtree, plus several men groups (bottoms, knitwear, shoes, suits, traditional wear) — has **0 products**. Remember this: it's why some tiles legitimately open empty lists, and it's why the missing empty-state UI (F7) is so visible.

### 1.2 Home screen — how the category tiles are built

The mobile home is server-driven (SDUI). `GET /storefront/home` returns a layout of widgets (default: banner carousel, campaign countdown, combo showcase, **CATEGORY_GRID**, product grid). The server builds the grid data with:

```ts
categoryRepo.findMany({ where: { isActive: true } }, 16); // order: level asc, name asc
```

— i.e. **the first 16 active categories sorted by level then name, with no filter on level and no check for images** ([`storefront.service.ts`](file:///c:/celebs/celebs/apps/api/src/modules/storefront/storefront.service.ts)).

Live result: **16 tiles = 2 roots + 14 level-2 groups** (roots sort first: `jewelry-and-accessories`, `men`), and the root `men` has `imageUrl = NULL` while every other tile has artwork.

The mobile [`CategoryGrid`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/components/category-grid.tsx) renders all 16 as-is (chunked into columns of 3 for a 3-row horizontal scroller) and navigates on tap:

```ts
navigateSafely(
  router.navigate({ pathname: '/category/[slug]', params: { slug: cat.slug, title } }),
);
```

If the SDUI fetch fails, the client falls back to `DEFAULT_HOME_LAYOUT`, and `CategoryGrid` then sources categories from the mobile tree API (`useCategories` → `/category/tree-with-attributes`), which returns the same tree but with parent prefixes stripped from display names (`processNodes` in [`categories/api.ts`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/api.ts)). That's the source of the naming inconsistency in F7: the SDUI payload sends raw server names, the tree API sends trimmed names.

### 1.3 Category screen — what's on it and what loads when it opens

[`app/category/[slug].tsx`](file:///c:/celebs/celebs/apps/mobile/src/app/category/%5Bslug%5D.tsx) composes, top to bottom:

1. `CategorySearchHeader` — back button, search input (`Search in <title>...`), cart button.
2. **Storefront shortcut rows** (the part you asked about) — rendered from the storefront config.
3. Action bar — filter button (with badge) + "N Items Found".
4. `FlashList` product grid, `numColumns={2}`.
5. `DynamicFilterDrawer` modal.

Two requests fire on open (TanStack Query):

**Request A — storefront config** (`GET /category/:slug/storefront`, via [`useStorefrontConfig`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/hooks/use-storefront-config.ts)).
Server-side ([`storefront-shortcut.service.ts`](file:///c:/celebs/celebs/apps/api/src/modules/storefront-shortcut/storefront-shortcut.service.ts)):

1. Resolve the slug to a category — matches on `id`, then `slug`, then `path`, then `name` (dashes → spaces), all case-insensitive (`findCategoryBySlugOrId`).
2. Load that category's `StorefrontShortcut` rows (`findByCategoryId` — **no `isActive` filter**, see F9).
3. For each row with `autoPopulate`, fetch its **active child categories** (name asc) and build items: `{ name, image, slug, filterValue: child.slug }`.
4. Return `{ category, shortcuts, drawerFilters: [] }` — **`drawerFilters` is hardcoded to an empty array**, and the shortcut `title` is dropped at this point (F3, F9).

This endpoint has **no HTTP cache and no Redis cache** — 2–3 DB queries per open, per client.

**Request B — product list** (`GET /products?status=published&category=<slug>&limit=20`, via [`useProducts`](file:///c:/celebs/celebs/apps/mobile/src/features/products/hooks/use-products.ts)). This is the hot read analyzed in §5.

### 1.4 The product query, server-side (the foundation of §4 and §5)

`ProductQueryService.getAllProducts` ([`product-query.service.ts`](file:///c:/celebs/celebs/apps/api/src/modules/product/product-query.service.ts)) does, in order:

1. **Resolve the category slug** (`findFilterMatch`) — tries `id`, `slug` (insensitive), `path` (insensitive), `name` (dashes→spaces).
2. **Find descendants** (`findDescendantIds`) — `parentCategory = id OR path = slug OR path startsWith 'slug/'`. For `men` this yields 39 ids (9 groups + 30 leaves); for `men-denim`, 4 ids.
3. **Build the Prisma where** — `status = 'published' AND (categoryId IN (ids) OR subcategoryId IN (ids))` plus optional `search`, `tag`, price, and the cursor tuple.
4. **First page (no cursor) = "page mode":** runs `count(*)` for `total`, then `findMany` with `skip/take`, and encodes a `nextCursor` from the last row (`createdAt` + `id`).
5. **Subsequent pages (cursor present) = "cursor mode":** no count; `take(limit + 1)` to detect `hasMore`.
6. **Cache:** public queries are stored in Redis for 60s, keyed by a SHA-256 of the canonical query object — **including the cursor**, so every page of every filter combination is a separate key (bounded by the 60s TTL).

Anything with a `search` param adds: `name ILIKE '%term%' OR brand ILIKE '%term%' OR tags @> ARRAY[term]` — the last one is **exact, case-sensitive array containment** (the root cause of F1, and half of F5).

### 1.5 Caching layers that already exist (a decent baseline)

| Layer          | Config                                                                                                         | Notes                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| CDN / HTTP     | `/products` → `max-age=30, s-maxage=60, swr=120`                                                               | public GETs only                                                                        |
| Redis list     | 60s TTL, key = SHA-256 of the canonical query **including cursor**                                             | per-cursor/page keys; `purgeProductLists` sweeps `product:list:*` when visibility flips |
| Redis detail   | 300s                                                                                                           | product PDP                                                                             |
| Home composite | 600s                                                                                                           | feeds the home grid + first 12 products                                                 |
| Mobile RQ      | list `staleTime` 2 min, `maxPages` 4; AsyncStorage persists only the unfiltered home feed, categories and SDUI | filtered/search queries stay in memory — good rule                                      |

**Gaps in coverage:** the storefront config endpoint (1.3) is uncached; the count and category-resolution queries are uncached on their own; and each keystroke generates a brand-new cache key (F6).

---

## 2. Q1 — "When we tap a category from home, is it working?"

**Short answer: yes for the tap and the destination load; no if you expected the sub-tabs to navigate or the empty categories to be handled.** The tile tap chain is correct and verified end-to-end; the destination screen has the UI defects covered in §3.

### 2.1 The tap chain, verified

| Step                                                                                       | File                                                                                                                                                                                         | Result |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Tile press → `handleCategoryPress` → `navigateSafely(router.navigate('/category/[slug]'))` | [`category-grid.tsx`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/components/category-grid.tsx)                                                                             | ✅     |
| Route registered with per-slug stack ids                                                   | [`_layout.tsx`](file:///c:/celebs/celebs/apps/mobile/src/app/_layout.tsx)                                                                                                                    | ✅     |
| Config loads (`GET /category/:slug/storefront`)                                            | [`use-storefront-config.ts`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/hooks/use-storefront-config.ts)                                                                    | ✅     |
| Products load (`GET /products?status=published&category=<slug>&limit=20`)                  | [`api.ts`](file:///c:/celebs/celebs/apps/mobile/src/features/products/api.ts) / [`product-query.service.ts`](file:///c:/celebs/celebs/apps/api/src/modules/product/product-query.service.ts) | ✅     |

I replicated the **exact** API semantics against the live DB (`findFilterMatch` + `findDescendantIds` + product where) and got: **`men` → 36 products, `men-denim` → 22, `men-jeans` → 19** — so tapping tiles navigates to a screen that genuinely loads the right items for those categories.

### 2.2 Walkthrough — "Tap Men Denim from home"

1. You tap the **Men Denim** tile. `router.navigate('/category/men-denim')` fires once (the navigation guard swallows rapid double-taps).
2. The screen mounts and fires two requests in parallel: the storefront config and the product list.
3. Config resolves `men-denim`, finds its one seeded "Subcategories" shortcut, auto-populates 4 items (Men Denim Jackets, Men Denim Shorts, Men Denim Tops, Men Jeans). The chip row renders below the search bar — no heading, because `title` is dropped (F9).
4. Products: `count(*)` → 22, `findMany` → first 20 newest, `nextCursor` returned. List renders with the layout defect from §3.1.
5. "22 Items Found" is displayed — but note it literally prints `products.length` (loaded count), not `total`, so after the first page it reads "20 Items Found" until you scroll (§3.4, F10).

### 2.3 What actually breaks on this path

- **Empty categories dead-end.** `men-bottoms`, `men-knitwear`, `men-shoes-and-footwear`, `men-suits-and-separates`, `men-traditional-and-cultural-wear`, and every jewelry tile hold 0 products (live DB). Tapping them opens a **blank white screen**: the `FlashList` renders an empty list, the action bar says "0 Items Found", and there is no empty-state message, no "explore other categories", no explanation. Data-wise this is expected (seed scope); UX-wise it reads as a broken screen. The home grid **actively advertises these empty destinations** because it does not filter tiles by having products (F7).
- **The home sub-tabs don't navigate.** Tapping "Men"/"Women" on the home header only moves the underline: `AppHeader` manages `activeSubTab` in local state and never calls a navigation callback (`onSubTabChange` is optional and **no screen passes it** — both `AppHeader` usages omit it). If your "tap on category from home" included those sub-tabs, the answer is: it does nothing by design right now.
- **The category screen shows no title.** The header has a back button, a search box, and a cart button — but the category name only appears inside the placeholder ("Search in Men Denim…"). There is no visible heading telling you which category you're in.

---

## 3. Q2 — "I think the UI is broken"

**Short answer: yes — there is one concrete layout bug (the product grid), one functional UI bug (the filter drawer), and several data-presentation issues (home grid quality, counts, missing title).** Details and exact math below.

### 3.1 The category product grid (F2) — highest-confidence visual defect

**The intent.** The grid is meant to be a 2-column fashion feed with 12px page gutters and a 6px gap between cards. You can see the intent in the numbers: `useProductCard` computes

```ts
CARD_WIDTH = (windowWidth − GRID_PADDING·2 − COLUMN_GAP) / 2   // (390 − 24 − 6) / 2 = 180
```

with `GRID_PADDING = 12` and `COLUMN_GAP = 6` ([`use-product-card.ts`](file:///c:/celebs/celebs/apps/mobile/src/features/products/hooks/use-product-card.ts)).

**What actually happens.** Three separate facts combine badly:

1. `[slug].tsx` passes **only** `contentContainerStyle={styles.listContent}` to the FlashList, and `listContent` contains `paddingVertical` only — **no horizontal padding anywhere**.
2. [`category.styles.ts`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/styles/category.styles.ts) defines a `columnWrapper` style (`paddingHorizontal: lg`, `justifyContent: 'space-between'`, `marginBottom: lg`) that is **referenced nowhere** (grep-verified). It is a `FlatList` concept — **FlashList has no `columnWrapperStyle` prop** (verified in `@shopify/flash-list` typings). The wishlist screen still passes `columnWrapperStyle` to a real `FlatList`, so this style was copy-adapted from there and left behind.
3. FlashList's `GridLayoutManager` doesn't use the card's width at all: it computes the cell as `windowWidth / numColumns` (**195px**) and marks it `enforcedWidth`, and `ViewHolder` applies that width to the item container. The card (180px) then sits **left-aligned inside a 195px cell**.

**Net rendering at 390px width:** card 1 occupies `x = 0..180` — flush against the screen edge; card 2 occupies `x = 195..375` — 15px after the first card and 15px short of the right edge. So you get: **zero left gutter, a gap of 15px instead of 6px between cards, and uneven margins (0 left vs 15 right)**. Compare with the home `ProductGrid`, which applies `paddingHorizontal: Spacing.md` + `space-between` and therefore looks correctly inset — the inconsistency between home and category grids is exactly the kind of thing that reads as "broken".

The `GRID_PADDING` / `COLUMN_GAP` constants are effectively dead: the enforced cell width overrides the card's own width for layout purposes.

_Confidence: high from source (FlashList layout manager + `ViewHolder` read in `node_modules`). A device screenshot is the final confirmation; the app was not launched during this read-only pass._

### 3.2 The filter drawer is decorative (F3)

**What the user sees:** opening the filter drawer shows Color, Size, and Fit sections with plausible options. Selecting them highlights them, increments the red badge on the filter icon, and "Apply" closes the drawer.

**What actually happens:** the hook stores `selectedColors`, `selectedSizes`, `selectedFits` in state — **but the object it builds for the API never includes them**:

```ts
filterParams = { limit: 20, category, search, minPrice, maxPrice, tag }; // no colors/sizes/fits
```

([`use-category-filters.ts`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/hooks/use-category-filters.ts)). So applying color/size/fit filters changes nothing about the results — the badge count is a lie — while price range and search **do** filter (those two are wired through).

**Why the drawer looks fake, too:** the options come from `FALLBACK_COLOR_OPTIONS` / `FALLBACK_SIZE_OPTIONS` / `FALLBACK_FIT_OPTIONS` — hardcoded lists in [`dynamic-filter-drawer.tsx`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/components/dynamic-filter-drawer.tsx) — because the storefront config always returns `drawerFilters: []` (hardcoded in the service). The API actually has a real `GET /category/:id/filters` endpoint that maps a category's attributes to UI control types, but **the mobile app never calls it**, so the drawer can't reflect real category attributes.

### 3.3 The home grid (F7)

- **Blank tile.** The root `Men` category has no `imageUrl`, and `MobileApparelImage` renders a `gray100` placeholder — so the home grid shows one plain grey disc among photo tiles. Same for any category without artwork.
- **Inconsistent names.** The SDUI payload (server) sends raw names — "Men Hoodies & Sweatshirts", "Bags And Small Leather Goods" — while the mobile tree API (explore/circles path) strips the parent prefix. The same category is labeled differently depending on which surface you're on.
- **Level-mixed tiles.** Because the server sorts `level asc`, roots and level-2 groups appear side by side: "Men" (root, empty-ish look) next to "Men Denim" (a stocked group). Tapping a root tile technically works (the descendant query catches everything below it), but the grid doesn't communicate the hierarchy.
- **Empty destinations.** Most tiles lead to empty subtrees (jewelry, men-bottoms, …) and there is no empty state — see §2.3.

### 3.4 Other visible gaps (smaller, but they add up)

- **No category title** on the category screen (F8) — only the search placeholder names the category.
- **"N Items Found" is the loaded count.** The action bar prints `products.length`. Page 1 with limit 20 shows "20 Items Found" even when the true total is 200; on a capped list it silently stops at 80 (F10).
- **No "results capped" notice** on the category screen, even though `useProducts` stops at `MAX_PAGES = 4` (80 items) and the home grid does surface a capped notice on its own surface.
- **Chip-row heading missing** (F9) — the seeded rows are titled "Subcategories", but the presenter drops `title`, so the avatar row floats with no label.
- **Sub-tab and header buttons are inert** (F8): All/Women/Men/Kids/Curve/Home don't navigate; the home Menu (hamburger) and Heart buttons have no `onPress` handlers at all.

---

## 4. Q3 — "Storefront shortcut below the search bar: does the flow work?"

**Short answer: it renders exactly where you wanted (between the search bar and the action bar) — but selecting a chip is functionally broken for almost every chip.** This is the flagship finding of the audit (F1, P0).

### 4.1 What is implemented

The category screen renders shortcut rows from the storefront config: `StorefrontShortcutRenderer` dispatches by `displayAs` — `avatar_scroll` → `AvatarScrollFilter`, `color_swatch` → `ColorSwatchFilter`, anything else → `ChipListFilter`. The seed (from the 2026-10-16 plan, §11) persists one "Subcategories" row per category-with-children; the live DB has **16 rows**, all `type = subcategory`, `displayAs = avatar_scroll`, `autoPopulate = true`, `items = []` filled at request time from active child categories.

### 4.2 The selection chain — step by step, with the flaw highlighted

```
1. User taps a chip (e.g. "Men Denim" on the Men page).
2. onSelectItem → handleSelectStorefrontShortcutItem:
      val = item.filterValue || item.slug || item.name       // = "men-denim"  (the CHILD SLUG)
      setSelectedStorefrontShortcutValue(val)                // toggles on repeat tap
3. useCategoryFilters builds:  filterParams.tag = "men-denim"
4. GET /products?category=men&tag=men-denim&status=published&limit=20
5. API (applyScalarFilters):   where.tags = { has: "men-denim" }
6. SQL:  tags @> ARRAY['men-denim']   ← exact, case-sensitive array containment
```

**The flaw:** step 2 stores a **category slug** in a field that step 5 treats as a **product tag**. Product tags are free-text marketing labels (`denim, jeans, winter, men, streetwear, apparel, …`); they only _accidentally_ ever contain a category slug. So the filter asks, in effect: "products tagged literally `men-denim`" — and almost nothing is.

### 4.3 The result, per chip (live DB simulation of the exact API query)

| Category page                 | Chip (auto-populated child)                                                                                       | Products returned via `tag` | Products actually in that subcategory |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------- |
| `men`                         | men-denim                                                                                                         | **0**                       | 22                                    |
| `men`                         | men-outerwear                                                                                                     | 1                           | 10                                    |
| `men`                         | men-hoodies-and-sweatshirts                                                                                       | **0**                       | 3                                     |
| `men`                         | men-tops                                                                                                          | **0**                       | 1                                     |
| `men`                         | men-bottoms / men-knitwear / men-shoes-and-footwear / men-suits-and-separates / men-traditional-and-cultural-wear | **0** each                  | 0                                     |
| `men-denim`                   | men-denim-jackets                                                                                                 | **0**                       | 3                                     |
| `men-denim`                   | men-jeans                                                                                                         | **0**                       | 19                                    |
| `men-denim`                   | men-denim-shorts / men-denim-tops                                                                                 | **0**                       | 0                                     |
| `men-hoodies-and-sweatshirts` | men-hoodies                                                                                                       | 2                           | 3                                     |
| `men-hoodies-and-sweatshirts` | men-sweatshirts / men-zip-up-hoodies                                                                              | **0**                       | 0                                     |

**Tally: on the Men page, 1 of 9 chips returns anything at all (and only 1 product, against 10 that live in that subcategory). On the Men Denim page, 0 of 4 chips work — including "Men Jeans", which hides 19 products.**

Why it "sometimes works": the scraped product tags happen to contain a few slug-like literals — the windbreaker carries `men-outerwear`, two hoodies carry `men-hoodies`, one product carries `men-jackets-and-coats`. Everything else fails.

### 4.4 Walkthrough — "Tap Men → tap the Denim chip"

1. You open the Men category (36 products show).
2. You tap the **Men Denim** avatar chip. It highlights (state stores `men-denim`).
3. The app refetches with `tag=men-denim`.
4. API returns `{ products: [], total: 0 }` — nothing matches the tag.
5. The grid empties, the action bar reads "0 Items Found", no message explains why. The chip still shows as selected, so it reads as "this category has no products" rather than "this filter is broken".

That is the exact experience behind "the shortcut is not working / the UI looks broken".

### 4.5 Secondary defects in the same flow

- **No heading:** the presenter builds `{ id, type, attributeId, displayAs, displayOrder, items }` and **drops `title`** ("Subcategories"), so the chip row has no label (F9).
- **Inactive rows still render:** `findByCategoryId` filters only by `categoryId`; `isActive` lives inside `filterConfig`, is never surfaced to mobile, and the repository doesn't filter by it — deactivating a shortcut in admin does nothing in the app.
- **Dead selection branch:** `AvatarScrollFilter` checks `selectedItem === 'All'` to mark the first item selected, but the hook can never store `'All'`.
- **Highlight key mismatch:** `ChipListFilter` compares `filterValue || name` while the hook stores `filterValue || slug || name` — an item with only `slug` set never highlights.
- **Color shortcuts can't work yet:** `ColorSwatchFilter` selections also flow into `tag`, but color filtering isn't supported by `/products` at all (colors live in `colorVariants` / `dynamicData`).

### 4.6 Fix direction (recommended)

For `type: 'subcategory'` items, filter by **category membership**, not tags — the item was produced from a child category, so that's the semantics the data already carries:

- **(a) Quick:** mobile sends the child slug through the existing `category` param. Cheapest change, but conflates "current category" and "shortcut category" in one param and loses the ability to combine them.
- **(b) Correct (recommended):** add a proper `subcategory=<slug>` (or `subcategoryId`) filter to `/products` that resolves the same descendant set as `applyCategoryFilters` (reuse `findFilterMatch` + `findDescendantIds`), then have mobile send it for shortcut items of type `subcategory`. Keep the `tag` filter only for genuinely tag-based shortcuts, and validate in the admin form that a tag-based item's `filterValue` is a real tag. This matches the seed's `type: 'subcategory'` contract.
- **(c) Not recommended:** make the seed write category slugs into every product's tags. It couples two unrelated concepts, breaks for every new product unless the writer repeats the trick, and still can't express level hierarchy.

Color-type shortcuts need separate work (a variant/attribute filter on `/products`); until then they will misfire for the same reason.

---

## 5. Q4 — "Is the hot read (products with filters) optimized?"

**Short answer: no.** The endpoint has good hygiene around it (CDN + Redis + cursor pagination), but the query itself is built against indexes that can't serve it, and every first page pays an extra full count. At the current 36-product scale you won't feel it; at catalog scale it degrades linearly with catalog size per category page.

### 5.1 What happens per request, in full

**One cold category-screen open = ~7 DB queries:**

- Config (3): resolve category → shortcuts → child categories. Uncached.
- Products (4): `findFilterMatch` → `findDescendantIds` → `count(*)` → `findMany`. The first two are uncached; the list result is Redis-cached for 60s.

After the first hit, the product list is served from Redis (60s) and the CDN (30–120s), so repeat traffic is cheap. But:

- Every **distinct filter combination** (each chip, each price range, each search string, each cursor page) gets a **fresh cache key** and pays the full cost once.
- During typing, that's one new key **per keystroke** (§5.5, item 5).

### 5.2 The EXPLAIN — what the query plan actually says

I ran `EXPLAIN (ANALYZE, BUFFERS)` on the exact query shapes (browse, browse+search, count). All of them resolve to the same shape:

```
Limit → Incremental Sort (createdAt DESC, id DESC)
  → Index Scan Backward using "Product_status_createdAt_idx"
        Index Cond: (status = 'published')
        Filter: ((categoryId = ANY(...)) OR (subcategoryId = ANY(...)))
        Rows Removed by Filter: 12–17 (of 36)
count(*) → same index scan + filter
```

In plain English:

1. The only index that provides the required order (`createdAt DESC, id DESC`) is `(status, createdAt)` — so Postgres walks published products **newest first**.
2. It cannot also filter by category in the index, because the filter is an **OR across two columns**, which no single composite index matches. So it tests **every row it walks** against the OR and **throws away the misses** (12–17 of 36 at current scale).
3. `count(*)` repeats the same walk.

**What this becomes at catalog scale** (the plan shape doesn't change, only the fallout):

- Browsing a category whose products are sparse/old (e.g. `men-knitwear`, 0 products) must walk **the entire published catalog** before returning an empty page.
- Browsing a busy category still walks newest-first across **all categories** until 21 rows survive the filter.
- Adding `search` makes it worse: `name ILIKE '%term%'` (and `brand`) can't be assisted by any existing index — every walked row is evaluated against the substring match.
- The `count(*)` doubles the walk for the first page of every cache-miss combination.

### 5.3 Index inventory and why it doesn't help

Live `pg_indexes` for the relevant tables:

| Index                             | Can it serve the browse?                                                                                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Product_status_createdAt_idx`    | Provides order + status; **cannot** filter category (that's the walk-and-discard).                                                                                         |
| `Product_categoryId_status_idx`   | Filters category + status; **cannot** provide `createdAt DESC` ordering → would require a sort of all matches.                                                             |
| `Product_subcategoryId_idx`       | Same problem, and it's on the wrong side of the OR.                                                                                                                        |
| `Product_brandId_idx`, `vendorId` | Unrelated to this path.                                                                                                                                                    |
| `Category_parentCategory_idx`     | Used by `findDescendantIds`, but the `path =` / `path LIKE` branches have **no index at all** (55 rows today).                                                             |
| No trigram, no tsvector, no GIN   | Search has zero index support. Extensions installed: `pgcrypto, uuid-ossp, pg_stat_statements, plpgsql, supabase_vault` — **no `pg_trgm`**; zero `tsvector` columns exist. |

### 5.4 What's cached vs what isn't

Covered in §1.5. The gaps that matter for this flow: the **storefront config endpoint is uncached**, the **category resolution queries are uncached**, the **count is not cached separately**, and **per-keystroke query keys** defeat caching during typing.

### 5.5 Recommendations, with expected effect

1. **Skip the count where it isn't used (storefront).** Cursor mode already omits `total`; make page mode do the same for public reads, or gate it behind `includeTotal=true` used only by the admin table. _Effect:_ removes one full scan per cold browse/search. The mobile UI never reads `total` (it prints `products.length`), so nothing regresses.
2. **Add composite indexes + rewrite the OR as UNION ALL of two branch queries.**
   ```sql
   CREATE INDEX CONCURRENTLY "Product_status_categoryId_createdAt_idx"
     ON "Product" (status, "categoryId", "createdAt" DESC, id DESC);
   CREATE INDEX CONCURRENTLY "Product_status_subcategoryId_createdAt_idx"
     ON "Product" (status, "subcategoryId", "createdAt" DESC, id DESC);
   ```
   Each branch is then a direct range scan that satisfies `WHERE + ORDER BY + LIMIT` in one index, with **limit pushdown** (it stops after 21 rows); the app merges and re-sorts at most 42 rows. _Effect:_ page cost becomes proportional to page size, not catalog size. (If the tree ever deepens past 3 levels, the more scalable variant is a denormalized ancestor-ids array with a GIN index.)
3. **Cache the category resolution** (`findFilterMatch` + `findDescendantIds`) in the existing TtlCache — they only change on category writes. _Effect:_ removes 2 queries from every cache miss.
4. **Add `publicCache` + Redis to `/category/:slug/storefront`.** It is static config. _Effect:_ removes 2–3 queries per category open per client.
5. **Debounce mobile search 250–300 ms and require ≥2 characters** (and/or `useDeferredValue`). _Effect:_ typing "hoodie" goes from 6 requests (each with count + list + fresh cache key) to 1 — and NAT'd offices stop risking the 300 req/min/IP limiter.
6. **When FTS lands (§6), add `sortBy=relevance` upstream** and keep `createdAt` as the cursor tie-breaker for stable pagination.

---

## 6. Q5 — "What about full-text search, like shein.com?"

**Short answer: today's search is a substring match with no index, no ranking, and no global surface. It is several steps away from shein.com — but the first two steps are cheap and can be done entirely in Postgres.**

### 6.1 What it feels like today (walkthrough)

1. There is **no global search**. The only search input in the app is inside a category page (`Search in Men Denim...`). The header search icon routes to `/explore`, which lists categories and has **no input field**.
2. You type `hoodie`. Every keystroke fires a request (§5.5).
3. The server runs: `name ILIKE '%hoodie%' OR brand ILIKE '%hoodie%' OR tags @> ARRAY['hoodie']`.
   - Live check: exactly **1 of 36** products matches (via name/brand).
   - The tag `hoodies` does **not** match `hoodie` (exact, case-sensitive, no stemming).
   - The tag `men-hoodies` is unreachable by typing "hoodie".
4. Results are sorted **newest first** — never by relevance.
5. No suggestions, no typo tolerance, no synonyms, no attribute/description search.

### 6.2 Capability matrix

| Capability | Status                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Search UI  | Only inside a category page; no global/typeahead search anywhere in `apps/mobile`.                                             |
| Matching   | `name ILIKE '%q%'` OR `brand ILIKE '%q%'` OR `tags @> [q]` (exact, case-sensitive). Singular/plural, case, and typos all fail. |
| Indexing   | None. No `pg_trgm`, no `tsvector`, no GIN. Every search evaluates every published row.                                         |
| Ranking    | Always `createdAt DESC`. Zero relevance.                                                                                       |
| Multi-word | Treated as one literal substring — "denim jacket" requires that exact character sequence.                                      |
| Fields     | Description, category names, and colors/materials from `dynamicData` are not searched.                                         |

### 6.3 Why the matching fails for common cases

- `ILIKE '%term%'` is a good substring matcher — but with no trigram index it's a full scan, and it can't do stemming (select ↔ selected) or fuzziness.
- `tags @> [q]` requires the exact tag as the user typed it. Users type "boots", data holds "boot"; users type "hoodie", data holds "hoodies"/"men-hoodies". Case matters (`Jeans` ≠ `jeans` if a tag is ever capitalized). This is the same semantic mistake as F1, in search form.
- Multi-word queries are ANDed into a single literal, so "black jeans" only matches names that literally contain "black jeans" in sequence.
- Because ranking doesn't exist, the best match can be buried under the newest match.

### 6.4 What "shein-like" requires, and a phased path that fits this codebase

A shein.com-grade experience = instant typeahead suggestions + fuzzy matching + relevance (popularity/quality-weighted) + often facet counts. Phased path:

- **Phase 1 — trigram substring search (pure Postgres, cheap).**
  1. `CREATE EXTENSION pg_trgm;`
  2. Add a generated/maintained `search_text` column (`name || brand || array_to_string(tags,' ') || category names`) with `GIN (search_text gin_trgm_ops)`.
  3. Rewrite the search predicate: split the query into terms, match each term with `search_text ILIKE '%term%'` (index-accelerated), AND them; use `similarity()` as a relevance signal.
     _Buys:_ indexed substring matching (any position), better multi-term behavior, typo tolerance via trigram similarity.
- **Phase 2 — real FTS semantics (still Postgres).**
  - `to_tsvector('simple', search_text)` with a GIN index, queried via `websearch_to_tsquery`; use prefix matching (`hoodie:*`) for typeahead; rank with `ts_rank_cd` plus a light popularity factor; keep `ILIKE` as a fallback.
    _Buys:_ word-level matching, stemming-ish behavior with `english` config, ranking, fast typeahead.
- **Phase 3 — only if true shein.com behavior is wanted.**
  - Meilisearch or Typesense (self-hosted, cheap), fed from the existing BullMQ pipeline on publish/unpublish events: instant search-as-you-type, typo tolerance, synonyms ("sneakers" → "shoes"), popularity ranking, facet counts. Postgres stays the source of truth; `/products?search=` proxies to it.
- **Client-side regardless of phase:** a global search route with recent + trending searches, 250 ms debounce, ≥2-char gate, and reuse of the existing `publicCache` / Redis layers for hot query strings.

Also fix the search/shortcut shared bug: tag matching must become part of the indexed `search_text` (or a normalized, lowercased tag index) — the current exact case-sensitive containment can never match what a user types.

---

## 7. Verification & limitations

**What was actually verified (and how):**

- **Structure:** codebase-memory graph queries for widgets/shortcuts/products/categories, then exact source reads of every cited file (both mobile and API).
- **Data:** read-only queries against the seeded dev DB (`.env.development` Supabase): counts (36 products / 55 categories / 16 shortcuts), the `(group, leaf)` product distribution, the home-grid query result, and a **per-chip simulation replicating the exact API semantics** (`findFilterMatch` + `findDescendantIds` + where clause) for the `men`, `men-denim`, and `men-hoodies-and-sweatshirts` pages.
- **Query plans:** `EXPLAIN (ANALYZE, BUFFERS)` for browse, browse+search, and count — plus index inventory from `pg_indexes` and extension/tsvector checks.
- **Layout:** FlashList library source in `node_modules` (`GridLayoutManager`, `ViewHolder`, prop typings) for the enforced cell width and the absence of `columnWrapperStyle`.

**Limitations (so this isn't read as more than it is):**

- The app was not launched; the grid-layout finding (§3.1) is source-derived and should be confirmed with one device screenshot on a seeded build.
- Plans were taken at the current catalog size (36 products); at this scale Postgres will pick the same shape it would at any scale here, but the _cost framing_ ("O(catalog) walk per page") is an architectural read of the plan, not a measured load test.
- The queried DB is the `.env.development` Supabase instance; your local seed state may differ.
- Per the repo's evidence tiers, this is a **Verify-level** audit (graph + source + live DB + plans). It is not a full test-suite run or device QA.

---

## 8. Prioritized action list

| Priority | Action                                                                                                                       | Files                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| P0       | Fix shortcut filtering (subcategory filter, not tag): mobile param + API `subcategory` support + admin item-field validation | `use-category-filters.ts`, `product-query.service.ts`, `product.validator.ts`, web-admin shortcut form |
| P0       | Grid layout fix: page gutters via `listContent` padding (or equivalent), remove dead `columnWrapper`, align width math       | `[slug].tsx`, `category.styles.ts`, `use-product-card.ts`                                              |
| P1       | Send color/size/fit filters (or remove them until supported); wire `/:id/filters` for real drawer options                    | `use-category-filters.ts`, `dynamic-filter-drawer.tsx`, `categories/api.ts`                            |
| P1       | Query: skip count for storefront, composite indexes + UNION rewrite, cache category resolution + storefront config           | `product-query.service.ts`, new migration                                                              |
| P1       | Search: debounce + min-length; then Phase-1 trigram `search_text`                                                            | mobile search header, API                                                                              |
| P2       | Empty-state UI + "capped results" notice + real item counts; home grid image/name quality                                    | category screen, SDUI presenter                                                                        |
| P2       | Wire sub-tabs or remove them; category title in header                                                                       | `app-header.tsx`, `category-search-header.tsx`                                                         |
| P3       | Surface `title` / `isActive` in presenter; filter inactive rows                                                              | `storefront-shortcut.service.ts`                                                                       |

---

## Appendix — Files inspected

**Mobile**

- [`apps/mobile/src/app/(tabs)/index.tsx`](<file:///c:/celebs/celebs/apps/mobile/src/app/(tabs)/index.tsx>)
- [`apps/mobile/src/app/(tabs)/explore.tsx`](<file:///c:/celebs/celebs/apps/mobile/src/app/(tabs)/explore.tsx>)
- [`apps/mobile/src/app/category/[slug].tsx`](file:///c:/celebs/celebs/apps/mobile/src/app/category/%5Bslug%5D.tsx)
- [`apps/mobile/src/app/_layout.tsx`](file:///c:/celebs/celebs/apps/mobile/src/app/_layout.tsx)
- [`apps/mobile/src/components/app-header.tsx`](file:///c:/celebs/celebs/apps/mobile/src/components/app-header.tsx) + [`app-header-subtabs.tsx`](file:///c:/celebs/celebs/apps/mobile/src/components/app-header-subtabs.tsx)
- [`apps/mobile/src/components/mobile-apparel-image.tsx`](file:///c:/celebs/celebs/apps/mobile/src/components/mobile-apparel-image.tsx)
- [`apps/mobile/src/utils/navigation-guard.ts`](file:///c:/celebs/celebs/apps/mobile/src/utils/navigation-guard.ts)
- Categories: [`api.ts`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/api.ts), [`use-categories.ts`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/hooks/use-categories.ts), [`use-category-filters.ts`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/hooks/use-category-filters.ts), [`use-storefront-config.ts`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/hooks/use-storefront-config.ts)
- Category components: [`category-grid.tsx`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/components/category-grid.tsx), [`category-circles.tsx`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/components/category-circles.tsx), [`category-search-header.tsx`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/components/category-search-header.tsx), [`storefront-shortcut-renderer.tsx`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/components/storefront-shortcut-renderer.tsx), [`dynamic-filter-drawer.tsx`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/components/dynamic-filter-drawer.tsx), filters: [`avatar-scroll-filter.tsx`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/components/filters/avatar-scroll-filter.tsx), [`chip-list-filter.tsx`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/components/filters/chip-list-filter.tsx)
- Styles: [`category.styles.ts`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/styles/category.styles.ts), [`categories.styles.ts`](file:///c:/celebs/celebs/apps/mobile/src/features/categories/styles/categories.styles.ts)
- Products: [`api.ts`](file:///c:/celebs/celebs/apps/mobile/src/features/products/api.ts), [`use-products.ts`](file:///c:/celebs/celebs/apps/mobile/src/features/products/hooks/use-products.ts), [`use-product-card.ts`](file:///c:/celebs/celebs/apps/mobile/src/features/products/hooks/use-product-card.ts), [`product-card.tsx`](file:///c:/celebs/celebs/apps/mobile/src/features/products/components/product-card.tsx), [`product-grid.tsx`](file:///c:/celebs/celebs/apps/mobile/src/features/products/components/product-grid.tsx)
- SDUI: [`dynamic-layout.tsx`](file:///c:/celebs/celebs/apps/mobile/src/features/sdui/components/dynamic-layout.tsx), [`widget-registry.tsx`](file:///c:/celebs/celebs/apps/mobile/src/features/sdui/components/widget-registry.tsx), [`use-sdui-layout.ts`](file:///c:/celebs/celebs/apps/mobile/src/features/sdui/hooks/use-sdui-layout.ts)

**API**

- Product: [`product-query.service.ts`](file:///c:/celebs/celebs/apps/api/src/modules/product/product-query.service.ts), [`product.controller.ts`](file:///c:/celebs/celebs/apps/api/src/modules/product/product.controller.ts), [`product.routes.ts`](file:///c:/celebs/celebs/apps/api/src/modules/product/product.routes.ts), [`product.repository.ts`](file:///c:/celebs/celebs/apps/api/src/modules/product/repositories/product.repository.ts), [`product-projections.ts`](file:///c:/celebs/celebs/apps/api/src/modules/product/repositories/product-projections.ts), [`product-response-shapes.ts`](file:///c:/celebs/celebs/apps/api/src/modules/product/product-response-shapes.ts), [`product-format.ts`](file:///c:/celebs/celebs/apps/api/src/modules/product/product-format.ts), [`product-cache.ts`](file:///c:/celebs/celebs/apps/api/src/modules/product/product-cache.ts), [`product-cursor.ts`](file:///c:/celebs/celebs/apps/api/src/modules/product/utils/product-cursor.ts)
- Category: [`category.repository.ts`](file:///c:/celebs/celebs/apps/api/src/modules/category/category.repository.ts), [`category.routes.ts`](file:///c:/celebs/celebs/apps/api/src/modules/category/category.routes.ts), [`category.service.ts`](file:///c:/celebs/celebs/apps/api/src/modules/category/category.service.ts)
- Storefront + shortcuts: [`storefront.service.ts`](file:///c:/celebs/celebs/apps/api/src/modules/storefront/storefront.service.ts), [`storefront.routes.ts`](file:///c:/celebs/celebs/apps/api/src/modules/storefront/storefront.routes.ts), [`storefront-shortcut.service.ts`](file:///c:/celebs/celebs/apps/api/src/modules/storefront-shortcut/storefront-shortcut.service.ts), [`storefront-shortcut.repository.ts`](file:///c:/celebs/celebs/apps/api/src/modules/storefront-shortcut/storefront-shortcut.repository.ts), [`storefront-shortcut.routes.ts`](file:///c:/celebs/celebs/apps/api/src/modules/storefront-shortcut/storefront-shortcut.routes.ts)
- Middleware: [`rate-limiter.middleware.ts`](file:///c:/celebs/celebs/apps/api/src/middlewares/rate-limiter.middleware.ts)
- Schema + seed: [`schema.prisma`](file:///c:/celebs/celebs/apps/api/src/db/schema.prisma), [`seed-products.ts`](file:///c:/celebs/celebs/apps/api/src/db/seed/seed-products.ts), [`seed-storefront-shortcuts.ts`](file:///c:/celebs/celebs/apps/api/src/db/seed/seed-storefront-shortcuts.ts), [`seed-categories-men.ts`](file:///c:/celebs/celebs/apps/api/src/db/seed/seed-categories-men.ts), [`products.json`](file:///c:/celebs/celebs/apps/api/src/db/seed/data/products.json)

**Contracts / docs**

- [`product.validator.ts`](file:///c:/celebs/celebs/packages/shared-types/src/validators/product.validator.ts), [`category.validator.ts`](file:///c:/celebs/celebs/packages/shared-types/src/validators/category.validator.ts)
- [`2026-10-16-auth-ux-shortcut-rename.md`](file:///c:/celebs/celebs/docs/plans/2026-10-16-auth-ux-shortcut-rename.md)
- FlashList (node_modules): `GridLayoutManager.js`, `ViewHolder.js`, `FlashListProps.d.ts`
