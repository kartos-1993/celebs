# Post-Seed Hardening: Auth UX, Naming, Contract, Vendor Gate

Branch: `fix/auth-ux-and-shortcut-rename` (from `fix/seed-service-parity` @ `aec5b110`)

## Decisions (user-confirmed)

- Sign-out: inline notice on login (recommended option); sessionStorage key `auth_notice`.
- QuickFilter → **StorefrontShortcut** rename across DB/API/web-admin/mobile (pre-production, no aliases).
- Harvest: aggregate-from-batches; scope men+jewelry; overwrite semantics for re-seeding; delete dead code; email gate **submit + resubmit**.
- Quiet "signed out" notice on login after intentional sign-out (consolidates #5 from review).
- Aliases stay; infinite fetch guard fixes; `getCategorySchemaFields` (P2) stays.

## Commits

- [§1] Logout/session correctness + dead-code removal + tests
- [§2] List-page loading skeletons (category, option-sets, vendors, finance)
- [§3] Attribute contract: extend zod attributeSchema with `variantType`/`optionSetName`, normalize seed writer, tests
- [§4] Brothers Collection vendor seed parity
- [§5] Vendor email-verification gate (submit/resubmit) + wizard banner
- [§6] QuickFilter → StorefrontShortcut rename (schema+migration, api module, shared-types, web-admin, mobile, seed no-op prune)
- [§7] Harvest aggregator + missing-attrs report — **scrapped**: tooling was built, then removed uncommitted in favour of the §8 rebuild
- [§8] Product seeding rebuilt from scratch — one `data/products.json` dataset + one `seed-products.ts` importer; legacy seeders/batches/harvest tooling deleted
- [§9] Execution log (bottom of this doc)
- [§10] Batch import: reusable `merge-seed-batch` converter (scraper batch → dataset, `--update` refresh) + 2 new Brothers Collection products, windbreaker entry enriched; importer gains optional `mainImages`/`packaging`/`warranty` and drops the 8-image cover truncation
- [§11] StorefrontShortcut seeding: persist the runtime "Subcategories" shortcut for every active parent category (replaces the no-op seed)
- [§12] Men apparel seed standardization: attribute vocabulary aligned to leaf schemas + SHEIN spec-table key fixes in the merge converter, guarded by a dataset-coverage spec

## Notes

- `taskManager` not in this session's tool set; section log is in §9/doc.
- New branch must contain the plan doc commit first (project convention).
- pg adapter warns when DATABASE_URL missing; seed stats scripts must not blow up on the warn noise (filter WARN lines).

## Execution log (§9)

- 2026-10-16 — §1–§6 + §5 committed: `a6d5c3ea` quiet sign-out, `4f4b81df` skeletons, `c2b016ea` Brothers Collection vendor, `7abe01e9` attribute contract, `983885ff` StorefrontShortcut rename, `189af6b9` vendor email gate.
- 2026-10-16 — §7 harvest tooling (aggregator, runner, spec, report) built but never committed; superseded before landing.
- 2026-10-16 — §8 rebuild: 3 legacy batches + 2 demo products merged into `data/products.json` (34 items; Title Case attribute keys; size-chart rows keyed by each category's own columns; current DB prices/flags baked in; duplicate jeans title dropped). New single importer `seed-products.ts` resolves brands/categories/vendors from the seeded foundation and writes through `ProductService.createProduct`, idempotent by name, with `--dry-run`. Legacy seeders, batches, `seed:3p`/`clean:reseed` scripts and the uncommitted harvest tooling deleted; master seed rewired to the single importer; `seed:products` script added.
- 2026-10-16 — Verification: new spec 8/8; api typecheck at baseline (29 TS7030 + 1 pre-existing TS2339; spec-config errors unchanged); live dry-run = 10 validated / 24 already present (no DB writes).
- 2026-10-16 — §10 batch import: scraper batch `celebs_seed_batch_1792093605674.json` (3 Brothers Collection items) merged into `data/products.json` via the new committed converter `src/scripts/maintenance/merge-seed-batch.ts` (`merge:seed-batch`, `--file` + `--update`): hoodie + GLESTORE fleece added, windbreaker entry replaced with the richer re-scrape (2→8 images, 6→20 attributes; `FLYER_LARGE`→`BOX_STANDARD`). Importer gained optional `mainImages` (exact covers) / `packaging` / `warranty` overrides; the 8-image cover truncation was removed (variant galleries were never capped). Dataset now 36 items.
- 2026-10-16 — §10 verification: specs 17/17 (11 importer + 6 converter); typecheck at baseline; dry-run = 12 validated / 24 present; real seed run = 12 created (DB products 24 → 36, all Brothers Collection, nothing existing touched); lint clean.
- 2026-10-17 — §11 shortcut seeding: `seed-storefront-shortcuts.ts` is no longer a no-op. It persists one "Subcategories" row per active parent category — the same config the service otherwise builds as a throwaway `temp-` row (type `subcategory`, `avatar_scroll`, `autoPopulate: true`, empty items) — so storefront output is unchanged but the rows are real and admin-editable. Categories that already have any shortcut row are skipped (no duplicate chip rows, admin edits untouched); `--reset` clears the table first because the category wipe re-creates ids. New `seed:shortcuts` script; the pure row builder is covered by 4 tests.
- 2026-10-17 — §11 verification: spec 4/4; typecheck at baseline (30 app / 38 spec, none in seed files); real run = 16 created (table 0 → 16), re-run = 0 created / 16 already configured; service check: `men` serves 1 subcategory shortcut with 9 auto-populated items, leaf `men-jeans` serves 0 (expected).
- 2026-10-17 — Vendor e2e checklist re-run: `vendor-onboarding.spec.ts` 9/9 — full onboarding walk + submit-blocked-unverified, resubmit-blocked-unverified, verified-resubmit-allowed all green.
- 2026-10-17 — Pushed `fix/seed-service-parity` (base, so the stacked PR has a remote base) and `fix/auth-ux-and-shortcut-rename`; opened stacked PR #5 → `fix/seed-service-parity` (10 commits): https://github.com/kartos-1993/celebs/pull/5. The `feat/phase-1…5` branches beneath the base remain unpushed.
- 2026-10-17 — Full stack pushed and PR'd: `feat/headers-cache-security-hardening` + phases 1–5 pushed; stacked PRs opened bottom-up — #6 catch-up → `staging`, #7 phase-1, #8 phase-2, #9 phase-3, #10 phase-4, #11 phase-5, #12 `fix/seed-service-parity` → phase-5, with PR #5 (auth-ux) completing the top. Merge bottom-up, retargeting each next PR to `staging` after the one below merges. https://github.com/kartos-1993/celebs/pulls
- 2026-10-18 — §12 men apparel standardization: the 36-item `data/products.json` men block now speaks each leaf category's own vocabulary (`Body`→`Body / Lining`, `Collar`→`Neckline`, `Season(s)`→`Temperature`, care/spec value lists aligned to the option sets) and `seed-categories-men.ts` / `seed-option-sets.ts` gained the matching schema + values (Apparel Temperature option set, wash-tone and care colors). `merge-seed-batch.ts` maps SHEIN spec-table label variants onto those keys so future scraper batches land schema-valid; merge-batch spec extended (7 tests). New `seed-product-attribute-coverage.spec.ts` guardrail (3 tests): every men item attaches to a leaf category, every attribute key exists on that leaf's schema, every value option belongs to its option set — the dataset can no longer silently drift. DB reseeded and re-verified against live rows.
- 2026-10-18 — §12 verification: spot-check specs 10/10 (`seed-product-attribute-coverage` 3/3, `merge-seed-batch` 7/7).
