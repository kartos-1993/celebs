# Verification Report — Storefront Search, Category Tree & Filter Drawer Plan

**Document verified:** `docs/plans/2026-10-17-storefront-search-category-tree-and-filter-drawer-plan.md` (295 lines)
**Verification date:** 2026-10-18
**Verification scope:** the plan's four features (search trigram, category-tree caching, filter drawer, shortcuts/grid), including every SQL statement, TypeScript snippet, and file/line reference it contains.

**Overall verdict: the plan's direction is correct — all four problems it describes are real — but the plan as written will not work end-to-end. It contains 5 blocking defects (code that fails or silently does nothing) and 8 significant issues. The status "Approved for Implementation" should be downgraded to "Draft — corrections required".**

Nothing in this report changes the plan's goals or scope. Every correction below is local to the specific claim that failed verification.

---

## 1. Scoreboard

| Plan section                        | What it claims                                          | Verdict                                          | Blocking problems |
| ----------------------------------- | ------------------------------------------------------- | ------------------------------------------------ | ----------------- |
| §2 Search (trigram)                 | Generated column + GIN index + query rewrite + debounce | **Fails as written**                             | S1, S2, S3        |
| §3 Category tree (caching)          | RAM + Redis + invalidation                              | **Mostly right, details wrong**                  | —                 |
| §4 Filter drawer                    | Schema + JSONB filters + hook wiring                    | **Fails as written**                             | D2, D3            |
| §5.1 Shortcut → category (F1)       | Route chip slugs into the `category` param              | **Works for seeded data, unsafe in general**     | —                 |
| §5.2 Shortcut isActive + title (F9) | Repository-level `isActive` filter                      | **Fails as written**                             | C1                |
| §5.3 Grid padding (F2)              | Add `paddingHorizontal` to FlashList container          | **No-op (will not change anything visible)**     | C4                |
| §6 Port-6543 economics              | Query-count and latency numbers                         | **Directionally fine, numbers are illustrative** | —                 |
| §7 Roadmap                          | Phase ordering                                          | **Fine, but Phase 1 needs rework**               | —                 |

How to read each finding below:

> **Plan says** — quote or paraphrase of the exact claim being checked.
> **Reality** — what was actually measured or read, with evidence.
> **Impact** — what happens if the plan is implemented as written.
> **Fix** — the concrete correction.

---

## 2. How this was verified

- **Code cross-check.** Every file/line reference in the plan was opened and compared (paths and line numbers cited throughout this report).
- **Live database tests.** All tests ran against the development database configured as `DIRECT_URL` in `apps/api/.env.development` (Supabase, direct port 5432), PostgreSQL **17.11**. Nothing was committed or modified: DDL tests used temporary tables inside rolled-back transactions; reads were plain `SELECT`s.
- **Live application-layer tests.** Prisma Client 7.2.0 (the exact version in this repo, with the `PrismaPg` adapter, same as `apps/api/src/config/db.prisma.ts`) was pointed at the dev database to execute the plan's JSON filters and compare them against raw SQL counts.
- **Library source inspection.** Installed sources were read directly: `@shopify/flash-list` 2.0.2, `express` 4.21.2, `axios` 1.8.4, `qs`.
- **External sources (for Prisma Migrate semantics only, labor cannot verify fully read-only).** The Python-side claim that Prisma wraps multi-statement migrations in a transaction is supported by [prisma/prisma discussion #10601](https://github.com/prisma/prisma/discussions/10601) and the Prisma integration-guide wording ("ensure the migration runs outside a transaction block"). The underlying PostgreSQL constraint was proven directly on this database (see S2). A scratch-database rehearsal is still recommended before merging (section 6).

Reference facts about the environment, for context:

| Fact                          | Value                                                         |
| ----------------------------- | ------------------------------------------------------------- |
| PostgreSQL                    | 17.11, `search_path = "$user", public, extensions`            |
| Dev data at verification time | 36 published products, 55 categories, 16 storefront shortcuts |
| Prisma Client                 | 7.2.0 (driver adapters via `@prisma/adapter-pg`)              |
| Express                       | 4.21.2, default query parser `'extended'` (qs)                |
| axios                         | 1.8.4                                                         |
| FlashList                     | 2.0.2                                                         |
| `pg_trgm`                     | **not installed**, but available (version 1.6)                |

---

## 3. Findings

## 3.1 Feature 1 — Search (`pg_trgm` + generated column)

### S1 — BLOCKING. The generated column SQL cannot be created: `array_to_string` is not an immutable function

> **Plan says** (§2.1, Step 1):
>
> ```sql
> ALTER TABLE "Product"
> ADD COLUMN IF NOT EXISTS "searchVector" text
> GENERATED ALWAYS AS (
>   lower(name || ' ' || coalesce(brand, '') || ' ' || array_to_string(tags, ' '))
> ) STORED;
> ```

**Reality — tested live.** PostgreSQL only allows generated columns and expression indexes to use **immutable** functions, because the value must be recomputable deterministically forever. Measured function flags on this exact database (`pg_proc.provolatile`: `i` = immutable, `s` = stable):

- `lower(text)` → **immutable** (fine)
- `array_to_string(anyarray, text)` → **stable** (not allowed)

Executing the plan's column definition on a temp table produced:

```
ERROR: generation expression is not immutable
```

The obvious fallback — replacing `array_to_string` with a cast, `tags::text` — **also fails**, because casting an array to text invokes `array_out`, which is stable for the same reason:

```
ERROR: generation expression is not immutable
```

Only the name+brand expression is truly immutable; this was proven to work:

```sql
GENERATED ALWAYS AS (lower(name || ' ' || coalesce(brand, ''))) STORED
-- CREATED successfully on the live database, value verified: 'foo bar'
```

**Impact.** The migration as written aborts. And because Prisma runs each migration in the plan's single file, the whole file fails (see S2), taking the three indexes with it.

**Fix — two options.**

- **Option A (recommended, simplest):** exclude `tags` from the search vector. Keep the existing exact-match clause `{ tags: { has: search } }` that already exists in `product-query.service.ts` (line ~280) as an OR branch. Nothing real is lost: the current tag behavior is exact equality, not substring, so this preserves today's matching while the vector covers name+brand.
- **Option B (keeps tag substring search):** add a small wrapper function whose entire job is to be marked immutable:

  ```sql
  CREATE OR REPLACE FUNCTION public.celebs_tags_to_text(tags text[])
  RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT array_to_string(tags, ' ') $$;
  ```

  Then use `celebs_tags_to_text(tags)` in the generated column. This is a controlled, documented exception: it is only safe because `text` element output is deterministic. It adds a custom DB object that migrations and future developers must be aware of — accept it only if tag substring search is a requirement.

### S2 — BLOCKING. `CREATE INDEX CONCURRENTLY` cannot run inside this migration

> **Plan says** (§2.1): one migration file containing, in order: `CREATE EXTENSION`, `ALTER TABLE ... ADD COLUMN`, and **three** `CREATE INDEX CONCURRENTLY` statements.

**Reality — tested live.** Inside an explicit transaction, PostgreSQL rejects the statement outright:

```
ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
```

Prisma Migrate runs each migration file inside a transaction; the accepted way to use `CONCURRENTLY` with Prisma is to keep each `CONCURRENTLY` statement in its own single-statement migration file (community-verified in prisma/prisma#10601; the Prisma integration guide likewise states the migration must run outside a transaction block). The plan puts all five statements in one file, so the whole migration aborts.

**Impact.** Migration fails on first run; because the file is transactional, no partial state is kept, but nothing gets created either.

**Fix.**

- Because the catalog is currently ~2,000 rows (36 published), the simplest correct choice is to **drop `CONCURRENTLY` entirely**: a plain `CREATE INDEX` takes a lock for milliseconds at this size and works inside the normal transactional migration.
- If `CONCURRENTLY` is kept for future-proofing, **split the migration into separate files**, one statement per file: `..._add_search_trgm_extension/migration.sql`, `..._create_product_search_trgm_index/migration.sql`, `..._create_product_status_category_index/migration.sql`, `..._create_product_status_subcategory_index/migration.sql`. Rehearse on a scratch database (section 6).

### S3 — BLOCKING. `searchVector` is not a Prisma field — the §2.2 query snippet does not compile, and there is no drift strategy

> **Plan says** (§2.2):
>
> ```typescript
> andClauses.push({
>   searchVector: { contains: normalized },
> });
> ```

**Reality.** The column does not exist on the live database yet (verified against `information_schema.columns`), and it is not declared in `apps/api/src/db/schema.prisma`. Prisma Client only exposes fields declared in the schema, so `searchVector: ...` is a TypeScript error today. Worse, the plan never says how the schema and the database will stay in sync afterward: a database column that the Prisma schema does not know about is exactly the situation `prisma migrate dev` is built to detect and remove.

**Impact.** The snippet fails to compile as-is; if the column is added to the DB manually and the schema is not updated, a future `migrate dev` may propose dropping it.

**Fix.** Pick one of two coherent strategies, and write it into the plan:

- **Option A — declared field:** add `searchVector String?` to the `Product` model in `schema.prisma` so `contains` compiles. Because the column is generated by the database, application code must never write to it. Rehearse `prisma migrate diff` on a scratch database to confirm Prisma reports no drift for a GENERATED column (see section 6).
- **Option B — no column at all:** create the GIN index directly on the expression (`lower(name || ' ' || coalesce(brand, ''))`), and perform the search through a raw SQL fragment in `product.repository.ts`. This avoids schema changes entirely, but the query must repeat the indexed expression **character-for-character** or the planner will not use the index, and the raw SQL must stay in the repository layer (services build plain filter objects — repo mandate: "zero Prisma in services").

### S4 — SIGNIFICANT. The 2-character gate cannot use the trigram index

> **Plan says** (§2.2): "minimum 2-char gate".

**Reality.** Trigram indexes accelerate patterns with at least 3 characters (three consecutive characters = one trigram). A 2-character search extracts no usable trigram and falls back to a table scan — exactly the behavior the index was added to avoid, just for the shortest (most frequent) queries.

**Fix.** Use a 3-character gate, or accept and document that 2-character searches bypass the index.

### S5 — SIGNIFICANT. The debounce snippet is unsafe in three ways

> **Plan says** (§2.2): debounce by wrapping `onSearchChange` in `category-search-header.tsx` with `useRef<NodeJS.Timeout>` and a `setTimeout(…, 300)`.

**Reality.**

1. **The input is controlled.** `category-search-header.tsx` (lines 40–46) renders `TextInput` with `value={searchQuery}` and `onChangeText={onSearchChange}`. If the propagated value is delayed by 300 ms, the visible text and the caret lag behind typing — keystrokes feel dropped.
2. **No teardown.** The snippet starts a timer and never clears it on unmount. `apps/mobile/AGENTS.md` §2 is explicit: timers MUST have an explicit teardown routine.
3. **Convention mismatch.** The repo standard is `ReturnType<typeof setTimeout>` (4 existing precedents, e.g. `navigation-guard.ts:11`, `banner-carousel.tsx:50`), not `NodeJS.Timeout` (which also assumes Node typings in a React Native package).
4. **Double debounce.** §4.3 then feeds the query through `debouncedSearchQuery` as well — two debounce layers where one belongs.

**Fix — keep the input immediate, debounce only the network-facing value:**

```tsx
const [text, setText] = useState(searchQuery); // immediate input value
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(
  () => () => {
    // teardown on unmount
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  },
  [],
);

const handleTextChange = useCallback(
  (next: string) => {
    setText(next);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      const trimmed = next.trim();
      onSearchChange(trimmed.length >= 3 ? trimmed : ''); // 3-char gate, see S4
    }, 300);
  },
  [onSearchChange],
);
```

Pass `value={text}` / `onChangeText={handleTextChange}` to the `TextInput`. Remove the §4.3 double debounce — the hook should consume `filters.searchQuery` directly.

---

## 3.2 Feature 2 — Category tree caching

Direction is right: the route is hit on home renders and has no in-process cache. Four detail-level corrections.

### T1 — The `activeOnly = true` default silently changes what the public tree contains

> **Plan says** (§3.3): `async getCategoryTreeWithAttributes(activeOnly = true)`.

**Reality.** Today the method's default is `activeOnly = false` (`category.service.ts:147`), and the public controller calls it with no arguments (`category.controller.ts:96`). So the containing page **currently includes inactive categories**. Flipping the default excludes them.

**Impact.** Probably what you want, but it is a behavior change shipped as a side effect of a caching PR. Nothing should change as an accident.

**Fix.** Decide explicitly. If active-only is desired, flip the default and note it in the plan (and changelog); if not, keep `false` and make the cache aware of the flag (T2).

### T2 — One cache key for two filter modes

> **Plan says** (§3.3): a single key `'category:tree:public:v1'` for all calls.

**Reality.** The method has an `activeOnly` parameter. With one key, the first caller's mode is frozen into the cache for everyone (and the in-process copy as well). A future admin/internal caller asking for `activeOnly = false` would receive the active-only tree — or worse, poison the public key.

**Fix.** Make the key mode-aware (`category:tree:public:v1:active` / `:all`), or only cache when `activeOnly === true` and let other modes pass through.

### T3 — Use the existing `TtlCache` instead of a hand-rolled static cache

**Reality.** The repo already has exactly this pattern: `apps/api/src/common/utils/ttl-cache.ts`, a two-tier cache (in-process L1 + Upstash L2) whose own documentation names "category tree" as an intended consumer. The plan instead hand-rolls a `static inMemoryTreeCache` field and calls the ioredis-based `getCachedJson` / `setCachedJson` from `redis-cache.service.ts` — a different, lower-level cache mechanism than the one the codebase established for this class of data.

**Impact.** Two parallel caching conventions doing the same job; the plan's diagram even labels the L2 as "Redis Master (ioredis)", which is not what `TtlCache` uses.

**Fix.** Express the tree cache through `TtlCache` (L1 + L2 + invalidation in one place). If there is a concrete reason to prefer the ioredis helpers, document that trade-off explicitly — otherwise it is off-convention.

### T4 — Two factual claims need correcting (they inflate the problem)

1. **"No server cache"** — the route already applies `publicCache({ maxAge: 300, sMaxAge: 3600, swr: 3600 })` plus a rate limiter (`category.routes.ts:54–60`). That is HTTP/CDN caching, not in-process caching, and native clients honor it unreliably — so server-side caching is still justified — but the plan's framing ("uncached requests hit PostgreSQL directly on every open") overstates the problem.
2. **Client `staleTime` is not 60m.** The plan's 4-tier diagram says so; the actual hook uses 5 minutes in production (the 4h figure is only the persistence layer's max age). Categories _are_ hydrated from storage (`_layout.tsx:60–70`) and home pull-to-refresh _does_ invalidate them (`(tabs)/index.tsx:40–45`), so those parts of the plan are correct.

**What the plan gets right here.** The invalidation points exist and are the correct ones: `createCategory`, `updateCategory` (which internally covers attribute updates — line ~187), and `deleteCategoryWithCascade`. The 4-tier shape (client → RAM → shared cache → DB) matches how the codebase actually works.

---

## 3.3 Feature 3 — Filter drawer

### D1 — WRONG DATA SHAPE. `sizes` elements are `{ name, … }`, not `{ size }`

> **Plan says** (§4.1): `sizes: [ { size: "M" }, { size: "XL" } ]` and (§4.2) `path: ['$[*].size']`.

**Reality — measured on live rows.** Every `sizes` element has the keys `name`, `bodyMeasurements`, `productMeasurements`. There is no `size` key:

```json
{ "name": "S", "bodyMeasurements": [], "productMeasurements": [] }
```

**Fix.** Filter on `name`. The corrected Prisma syntax is in D2.

### D2 — BLOCKING. The plan's color/size filters silently return **zero rows**

> **Plan says** (§4.2):
>
> ```typescript
> colorVariants: { path: ['$[*].name'], array_contains: color }
> sizes: { path: ['$[*].size'], array_contains: size }
> ```

**Reality — executed live through the app's own Prisma Client (7.2.0 + `PrismaPg` adapter).** Both shapes were run and compared against raw SQL ground truth:

| Query                                                                   | Result                         |
| ----------------------------------------------------------------------- | ------------------------------ |
| Ground truth: published products containing `"Blue"` in `colorVariants` | **13**                         |
| Plan's shape: `path: ['$[*].name'], array_contains: 'Blue'`             | **0 rows** (no error — silent) |
| `path: ['$[*].name'], equals: 'Blue'` (variant)                         | **0 rows**                     |
| `path: ['$[*].size'], array_contains: 'M'`                              | **0 rows**                     |
| Ground truth: published products containing size name `"M"`             | **31**                         |

Prisma compiled the `path` form to a `#>` operator that extracts a _single_ literal value along the path — it never fan-outs across array elements, so it can never match. Nothing errors; the list is simply wrong.

**What works (verified returning matches):**

```typescript
{
  colorVariants: {
    array_contains: [{ name: color }];
  }
}
{
  sizes: {
    array_contains: [{ name: size }];
  }
}
```

`array_contains` with an array-wrapped **partial object** compiles to a JSONB containment check (`@>`), which is exactly the semantics wanted: "some element of this array contains `{ name: 'Blue' }`". Note this is an _exact element-name_ match (`"Light Blue" ≠ "Blue"`), which is what the drawer choices intend.

**Impact of shipping as written.** Color and size filters would render in the UI, badges would update, and the list would empty or stay unchanged — the exact class of bug this plan exists to fix, just moved one layer down.

### D3 — BLOCKING. `dynamicData.path: ['fit']` matches nothing; the real keys are `values.fitType` / `values["Fit Type"]`

> **Plan says** (§4.2): `dynamicData: { path: ['fit'], equals: fit }` (and §4.1's example `{"fit": "Slim Fit"}`).

**Reality — measured on live rows.** No product has a top-level `fit` key. Fits live inside `dynamicData.values`, under **two different spellings**:

| Key                  | Published distribution                                    |
| -------------------- | --------------------------------------------------------- |
| `values.fitType`     | Regular Fit 14, Loose 4, Skinny 3, Oversized 1, (none) 14 |
| `values["Fit Type"]` | Regular Fit 8, Loose 4, (none) 24                         |

Verified working through the app's Prisma Client:

```typescript
{ dynamicData: { path: ['values', 'fitType'],     equals: fit } }  // 4 products for 'Loose'
{ dynamicData: { path: ['values', 'Fit Type'],    equals: fit } }  // 4 products for 'Loose'
```

**Fix.** OR over both key spellings:

```typescript
if (filters.fits?.length) {
  andClauses.push({
    OR: filters.fits.flatMap((fit) => [
      { dynamicData: { path: ['values', 'fitType'], equals: fit } },
      { dynamicData: { path: ['values', 'Fit Type'], equals: fit } },
    ]),
  });
}
```

`dynamicData.variants` / `dynamicData.uploadedAssets` also exist at the top level — do not assume `dynamicData` is a flat attribute bag.

### D4 — Wrong file name and wrong schema name

> **Plan says** (§4.2): extend `product.schema.ts` and name it `productFilterQuerySchema`.

**Reality.** The public product query schema is `productFilterSchema`, and it lives in `packages/shared-types/src/validators/product.validator.ts` (lines 229–259). It is parsed in `product.controller.ts:123`.

**Fix.** Change the plan's references. Also keep the plan's `z.union([z.string(), z.array(z.string())])` + `.transform(split(','))` pattern — that part is correct and the plumbing was verified end-to-end (see D6).

### D5 — The drawer's fallback options partly do not exist in the data

**Reality.** The hard-coded fit options in `dynamic-filter-drawer.tsx` include "Slim Fit", "Wide Leg", and "Straight Leg". None of these occur as a fit value anywhere in the catalog — the actual values are Regular Fit / Loose / Skinny / Oversized. Several fallback colors (e.g. "Multicolor") will likewise match nothing.

**Impact.** Even after D2/D3 are fixed, some chips will always return 0 products. This is a product-data/labels question, not a code bug — but the plan should acknowledge it.

**Fix — pick one:** (a) derive the drawer options from the values actually present in the catalog (the drawer's purpose), or (b) trim the static fallback lists to values that exist. Recommend (a) as a follow-up, (b) as the immediate fix.

### D6 — VERIFIED CORRECT. Variant parameter plumbing works end-to-end

Worth stating positively, because it is the part that _does_ work exactly as the plan assumes:

1. **axios 1.8.4** serializes arrays in bracket notation — `colors[]=Blue&colors[]=Black` (source: `helpers/toFormData.js:163`, default `indexes` → `key + '[]'`).
2. **Express 4.21.2** uses the `'extended'` query parser by default (`lib/application.js:84`), i.e. `qs`.
3. **qs** parses `colors[]=Blue&colors[]=Black` → `['Blue', 'Black']`, and a single `sizes=M` → the string `'M'` — both verified live. The plan's `z.union([string, array])` accepts both.

Also verified: the drawer file is indeed 262 lines, and the intended decomposition targets are achievable within the FSD 150-line rule.

---

## 3.4 Feature 4 — Shortcuts and grid

### C1 — BLOCKING. `isActive: true` in the shortcut repository is invalid — there is no such column

> **Plan says** (§5.2): "In `storefront-shortcut.repository.ts`, add `isActive: true` to prevent deactivated shortcuts from rendering."

**Reality.** The `StorefrontShortcut` model (`schema.prisma:1482–1493`) has **no `isActive` column**. Activity lives inside the `filterConfig` JSON, and every live row has `filterConfig.isActive === true`. A `where: { isActive: true }` clause does not compile against the schema and would throw at runtime if forced.

Moreover, the plan's footnote is wrong about the service: `formatFilter` (`storefront-shortcut.service.ts:58–74`) already tries to _read_ `isActive` — but from the database row (where it does not exist, so it is always `undefined` → treated as `true`) instead of from `filterConfig.isActive`.

**Impact.** The filter cannot be implemented where the plan says; and as long as `formatFilter` reads the wrong object, every deactivated shortcut still renders.

**Fix.** All in the service, not the repository:

1. In `formatFilter`, read `config.isActive` (the parsed `filterConfig`) instead of the row's `isActive`.
2. Where the public storefront config is assembled (the loop that pushes formatted shortcuts at `:157–164`), skip entries whose `isActive` is false.
3. Do **not** filter in the repository — the admin listing uses the same repository and must still see deactivated shortcuts.

### C2 — Restoring `title` server-side is invisible until the mobile side knows about it

> **Plan says** (§5.2): restore `title: qf.title` in the push.

**Reality.** The line is syntactically fine (the loop variable is `qf`), but the mobile `StorefrontShortcutConfig` type declares no `title`, and no mobile renderer displays one. The restored field would ship dead.

**Fix.** Either add `title` to the mobile type and render it (chip label/accessibility), or drop this part of F9 until the UI does something with it. Either way, say so in the plan so the change is not silently ineffective.

### C3 — F1 works for seeded slugs but breaks for free-text shortcut values (worse than today)

> **Plan says** (§5.1 / §4.3): send `category: selectedStorefrontShortcutValue || categorySlug`.

**Reality — two halves.**

- **Works for slug values:** chip values are leaf-category slugs, generated per request from the active children of the browsed category (`filterValue: child.slug`, `storefront-shortcut.service.ts:139–155`; the stored `items` arrays of the current 16 rows are empty). `findFilterMatch` (`category.repository.ts:91–104`) resolves those slugs to category rows, and products carry the matching `subcategoryId`. With the plan's fix, `men-denim` would return 22 products, `men-jeans` 19, and `men-outerwear` / `men-jackets-and-coats` 10 each (subtree counts, measured live).
- **Breaks:** the admin UI permits free-text `filterValue`s. For any value that is not a category slug/id/name/path, `findFilterMatch` returns `null`, and `applyCategoryFilters` (`product-query.service.ts:285–324`) then **silently drops the category condition entirely**. The "filtered" category screen would show the whole unfiltered storefront — worse than today's behavior (which returns 0 products, clearly wrong-visible).

**Live measurement of the current tags-based behavior** (all shortcut-bearing categories): 53 active chip values exist; only **3** return any product through `tags @>` — and those are accidents, tag rows that happen to equal a category slug (`men-hoodies` 2 products, `men-outerwear` 1, `men-jackets-and-coats` 1). The other **50 of 53 chips (94%) return zero products**, and even the accidental matches under-report (1–2 products, versus 3–10 in the correct category subtree). This is the hard evidence behind the audit's "90%+ of chips return 0 products".

**Fix — preferred:** keep the parent scope and add a subcategory parameter:

```typescript
// mobile sends both; API intersects if the subcategory resolves
category: categorySlug,
subcategory?: resolvedSlug,
```

In the service, resolve `subcategory` via `findFilterMatch`; if it resolves, intersect its descendant set with the parent scope; if it does not, return an empty scope (fail closed) or surface a validation error — never fall through to an unfiltered listing.

**Minimum alternative** if the plan's single-param shape is kept: make an unresolvable `category` value return an empty scope instead of being ignored. At least make the failure visible and safe.

### C4 — BLOCKING (as a fix). `paddingHorizontal` on the FlashList container is a no-op

> **Plan says** (§5.3): "Add `paddingHorizontal: 12` to `listContent` container in FlashList to restore proper 12pt edge spacing."

**Reality — read from FlashList 2.0.2 source.**

- The string `contentContainerStyle` appears **nowhere** in the entire installed `@shopify/flash-list` package. It is only part of the type surface by inheritance (`FlashListProps extends Omit<ScrollViewProps, …>`, `FlashListProps.d.ts:31`), and at runtime it is forwarded generically — the list's own layout code never reads it.
- Grid cells are **absolutely positioned**: their `style` carries `position: absolute`, `left`, `top`, and `width` (per the library's own prop documentation). `left` is computed by `GridLayoutManager` from `boundedSize = windowSize.width` (`GridLayoutManager.js:16`), where `windowSize` is measured from the list's outer wrapper (`RecyclerView.js:303`) — which has `overflow: "hidden"`.
- Therefore horizontal padding on the content container cannot move the cells. In the best case it does nothing; in the worst case it insets the content area while the cells keep full-window coordinates, and the right column gets clipped.

**Same issue affects today's code:** the current `contentContainerStyle={styles.listContent}` (`[slug].tsx:92–96`) — including its `paddingVertical` — is being ignored the same way.

**Fix — pad each cell, not the container.** Keep FlashList at full width, and wrap the item in a dedicated cell wrapper inside `renderItem` (memoized, per the mobile AGENTS renderItem mandate). The existing card width math already matches this design: `CARD_WIDTH = (windowWidth − 24 − 6) / 2` (`use-product-card.ts:31,51`) — 24 = two 12pt edge margins, 6 = the inter-card gap, giving 180 on a 390pt screen while each grid cell is 195pt wide.

```
Left column cell:   paddingLeft: 12, paddingRight: 3   → card at x 12…192
Right column cell:  paddingLeft: 3,  paddingRight: 12  → card at x 198…378
Result: 12pt edges, 6pt gap — exactly the designed geometry.
```

Implementation sketch:

```tsx
const renderGridCell = useCallback(
  ({ item, index }: ListRenderItemInfo<Product>) => (
    <View style={index % 2 === 0 ? styles.cellLeft : styles.cellRight}>
      <ProductCard product={item} />
    </View>
  ),
  [],
);
```

with `styles.cellLeft = { paddingLeft: 12, paddingRight: 3 }` and `styles.cellRight = { paddingLeft: 3, paddingRight: 12 }` in `category.styles.ts`, and the card filling its cell width. Also remove the dead `listContent` padding while touching it (it never applied), and keep the plan's other F2 item — deleting the dead `columnWrapper` (`category.styles.ts:72–76`, confirmed unused) — which is correct.

---

## 3.5 Sections 6–7 — economics and roadmap

- The §6 numbers (90ms → 15ms, −99.9%, "8× headroom") are illustrative, not measurements. Keep them as directional motivation only, or replace with a one-line note that they need measuring after implementation.
- One nuance on "omit count(\*)": the service already skips the count whenever a cursor is present (`product-query.service.ts:167–170`), so the "-50%" applies to **first-page loads only** — subsequent cursor pages never counted. The optimization is still valid (mobile renders `products.length`, not `total`), but the plan should state the real scope.
- §7's phase order is sound. Phase 1 must absorb the corrections from S1–S4, and its acceptance criterion should include an `EXPLAIN ANALYZE` before/after on the search query, not just "works".

---

## 4. Consolidated corrections checklist

Use this as the edit list for the plan document.

| #   | Location in plan | Correction                                                                                                                                                                                                                                         |
| --- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | §2.1 DDL         | Remove `array_to_string(tags, ' ')` from the generated column (or add an IMMUTABLE wrapper function). Working expression verified: `lower(name \|\| ' ' \|\| coalesce(brand, ''))`.                                                                |
| S2  | §2.1 DDL         | Drop `CONCURRENTLY` (table is ~2k rows), or split each CONCURRENTLY statement into its own single-statement migration file.                                                                                                                        |
| S3  | §2.1 + §2.2      | Choose and document one integration path: (A) add `searchVector String?` to `schema.prisma` + drift rehearsal, or (B) expression index + raw SQL fragment in `product.repository.ts`. Never leave the column DB-only and the query referencing it. |
| S4  | §2.2             | 3-character gate (trigrams need 3 chars).                                                                                                                                                                                                          |
| S5  | §2.2             | Debounce the query param, not the controlled input; add unmount teardown; use `ReturnType<typeof setTimeout>`; remove the §4.3 double debounce.                                                                                                    |
| T1  | §3.3             | Decide and document the `activeOnly` default; note it as a behavior change if flipped.                                                                                                                                                             |
| T2  | §3.3             | Make the cache key include the `activeOnly` mode, or only cache `true`.                                                                                                                                                                            |
| T3  | §3.3             | Use the existing `TtlCache`; fix the "ioredis" tier description.                                                                                                                                                                                   |
| T4  | §1/§3.1          | Correct the "no server cache" framing (route already has `publicCache`) and the staleTime claim (5 min, not 60 min).                                                                                                                               |
| D1  | §4.1             | `sizes` elements are `{ name, … }`, not `{ size }`.                                                                                                                                                                                                |
| D2  | §4.2             | Use `array_contains: [{ name: value }]` for both `colorVariants` and `sizes`.                                                                                                                                                                      |
| D3  | §4.2             | Fits: OR over `['values','fitType']` and `['values','Fit Type']`; there is no `['fit']`.                                                                                                                                                           |
| D4  | §4.2/§7          | File is `packages/shared-types/src/validators/product.validator.ts`; schema is `productFilterSchema`.                                                                                                                                              |
| D5  | §4.3             | Reconcile drawer option lists with values that exist in the catalog (or derive from data).                                                                                                                                                         |
| C1  | §5.2             | Move `isActive` handling to the service (`filterConfig.isActive`); fix `formatFilter`'s wrong source; never filter in the shared repository.                                                                                                       |
| C2  | §5.2             | Add `title` to the mobile type/renderer or drop the title restore.                                                                                                                                                                                 |
| C3  | §5.1/§4.3        | Prefer `category` (parent) + `subcategory` (resolved leaf); fail closed on unresolvable values — never fall through to an unfiltered list.                                                                                                         |
| C4  | §5.3             | Replace container padding with per-cell wrapper padding (left 12/3, right 3/12); also delete the dead `listContent` padding.                                                                                                                       |

---

## 5. Corrected code reference (drop-in replacements)

**DDL (Option A, no tags — verified working expression, plain `CREATE INDEX`):**

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "searchVector" text
GENERATED ALWAYS AS (lower(name || ' ' || coalesce(brand, ''))) STORED;

CREATE INDEX IF NOT EXISTS "product_search_vector_trgm_idx"
ON "Product" USING gin ("searchVector" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "product_status_category_created_idx"
ON "Product" (status, "categoryId", "createdAt" DESC, id DESC);

CREATE INDEX IF NOT EXISTS "product_status_subcategory_created_idx"
ON "Product" (status, "subcategoryId", "createdAt" DESC, id DESC);
```

**Service filters (verified against live data through Prisma 7.2.0):**

```typescript
// colors
if (filters.colors?.length) {
  andClauses.push({
    OR: filters.colors.map((color) => ({
      colorVariants: { array_contains: [{ name: color }] },
    })),
  });
}

// sizes
if (filters.sizes?.length) {
  andClauses.push({
    OR: filters.sizes.map((size) => ({
      sizes: { array_contains: [{ name: size }] },
    })),
  });
}

// fits
if (filters.fits?.length) {
  andClauses.push({
    OR: filters.fits.flatMap((fit) => [
      { dynamicData: { path: ['values', 'fitType'], equals: fit } },
      { dynamicData: { path: ['values', 'Fit Type'], equals: fit } },
    ]),
  });
}
```

**Search (Option A: field declared in schema; keep existing exact tag clause as an OR):**

```typescript
if (filters.search && filters.search.trim().length >= 3) {
  const normalized = filters.search.trim().toLowerCase();
  andClauses.push({
    OR: [
      { searchVector: { contains: normalized } },
      { tags: { has: filters.search.trim() } }, // preserve existing exact tag match
    ],
  });
}
```

**Mobile debounce:** see the snippet in S5.

**Grid cells:** see the sketch in C4.

---

## 6. Open items that require a scratch-database rehearsal

These could not be proven with read-only access; each is a 5-minute check on a local/scratch database before merging.

1. **Prisma Migrate transaction wrapping.** Confirm that a single-statement `CREATE INDEX CONCURRENTLY` migration file executes without a transaction (and that a multi-statement file would have failed — already proven semantically by the live `ERROR`).
2. **Schema drift behavior.** With the generated `searchVector` column present in the database and declared as `searchVector String?` in the schema, run `prisma migrate diff` / `migrate dev` and confirm Prisma reports no diff (or handle whatever it reports). Same check for Option B's expression index.
3. **Index behavior after creation.** `EXPLAIN ANALYZE` the search query before/after, at current data volume, to replace the plan's "<2ms" claim with a measured number (and to confirm the Bitmap Index Scan actually happens).

---

## 7. What the plan gets right

For completeness, so the revision keeps these:

- Correctly identifies all four underlying problems (they match the prior audit's F1/F2/F9 findings and the search/tree observations).
- Correct repo conventions: migration directory, `DIRECT_URL` for DDL, controller→service→repository layering, shared-types validators.
- The category-tree caching tier concept matches the existing `TtlCache` design, and the invalidation points it names are the right ones.
- The variant-parameter plumbing it assumes (axios → Express → zod) is real and verified.
- The F2 diagnosis (dead `columnWrapper`) and the F1 approach (chips should route to category, not `tag`) are correct for the seeded data.
- The drawer decomposition targets (5 files, ≤150 lines) are realistic (the file is 262 lines today).

---

## 8. Appendix — how to reproduce the key tests

All DB tests were run as one-off Node scripts against `DIRECT_URL` from `apps/api/.env.development` using the repo's own `pg` and Prisma Client packages. Representative SQL:

```sql
-- S1: generated-column immutability
BEGIN;
CREATE TEMP TABLE gc_test (
  name text NOT NULL, brand text, tags text[],
  sv text GENERATED ALWAYS AS (
    lower(name || ' ' || coalesce(brand, '') || ' ' || array_to_string(tags, ' '))
  ) STORED
);                       -- → ERROR: generation expression is not immutable
ROLLBACK;

-- S2: CONCURRENTLY inside a transaction
BEGIN;
CREATE INDEX CONCURRENTLY IF NOT EXISTS probe ON "Category" (name);
                         -- → ERROR: cannot run inside a transaction block
ROLLBACK;

-- S1: function volatility on this server
SELECT proname, provolatile FROM pg_proc
WHERE proname IN ('lower', 'array_to_string');
-- lower → 'i' ; array_to_string → 's'
```

Prisma-layer checks were executed through `new PrismaClient({ adapter: new PrismaPg(pool) })` against the same `DIRECT_URL`, comparing `findMany` results against raw `SELECT count(*)` ground truth (D2/D3 tables above).

---

## Appendix B — How `tags` participates in filtering (deep dive)

**What the column is.** `Product.tags` is a Postgres `text[]` (string array) of free-form labels, default `[]`. Live snapshot: all 36 published products carry tags; every value is lowercase; 17 distinct values; **no index on the column** (`pg_indexes` shows none), so every tag predicate is a table scan today.

**Where tags are consulted today — exactly two places in `product-query.service.ts`:**

1. **Global search** (`:247–253`). The search OR is:
   - `name ILIKE '%term%'` — case-insensitive substring
   - `brand ILIKE '%term%'` — case-insensitive substring
   - `tags @> ARRAY['term']` (Prisma `has`) — **exact, whole-element, case-sensitive**
2. **Explicit `tag` param** (`:280–282`) — `tags @> ARRAY[value]`, same exact semantics.

Consequences: searching "denim" matches the `denim` tag, but "Denim" does not (only the name/brand branches are case-insensitive); "jea" never matches the `jeans` tag; tag filtering is all-or-nothing equality.

**What the live tag vocabulary looks like.** `men` 31, `denim` 22, `bottoms` 19, `jeans` 19, `streetwear` 19, `outerwear` 12, `jackets` 9, `apparel` 3, `jacket` 3, `winter` 3, `demo` 2, `generic-unbranded` 2, `men-hoodies` 2, `men-hoodies-sweatshirts` 2, `manfinity` 1, `men-jackets-and-coats` 1, `men-outerwear` 1. The mix is telling: real facets (`denim`, `jeans`), near-duplicates (`jacket` vs `jackets`), category-slug-like artifacts (`men-hoodies-sweatshirts` — the actual category slug is `men-hoodies-and-sweatshirts`), a brand (`manfinity`), and seed markers (`demo`, `generic-unbranded`).

**The plan's intent vs the side effect.** §2.1 wanted `array_to_string(tags, ' ')` inside the generated `searchVector` so partial searches would also hit tags. That DDL fails (immutability — S1). But note the quieter problem: the plan's §2.2 replacement deletes the whole existing search OR, including the exact-tag branch — after the plan, tags would play **no role in search at all**. Recommended: keep `{ tags: { has: term } }` as an OR branch next to the trigram clause (behavior preserved); include tags in the vector only if partial tag matching is an explicit product requirement — that needs the `IMMUTABLE` wrapper from S1 and is a conscious semantic change.

**Input normalization gap.** `productFilterSchema.tag` (`product.validator.ts:236`) and create/update `tags` (`:154`) apply no `trim`/case folding. Live data is lowercase only by seed discipline; a future admin writing `Men` would silently never match any `has` query.

**Index decision.** `@>`/`has` is exactly what a GIN index on `tags` accelerates (`CREATE INDEX … USING gin (tags)`). At 36 products it is unnecessary; add it in the same migration only if the `tag` parameter survives as a public/documented API. (After the F1 fix, mobile stops sending `tag`; no web-admin usage was found.)

**Chips must not route through tags.** Live proof: 53 chip values, 50 return zero via `tags @>`, and the 3 accidental matches under-report (see C3). Category routing — the plan's direction — is correct; tags remain a search/facet ingredient only.

---

_This report is read-only analysis; no repository files and no database objects were modified during verification._
