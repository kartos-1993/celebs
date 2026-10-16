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

## Notes

- `taskManager` not in this session's tool set; section log is in §9/doc.
- New branch must contain the plan doc commit first (project convention).
- pg adapter warns when DATABASE_URL missing; seed stats scripts must not blow up on the warn noise (filter WARN lines).

## Execution log (§9)

- 2026-10-16 — §1–§6 + §5 committed: `a6d5c3ea` quiet sign-out, `4f4b81df` skeletons, `c2b016ea` Brothers Collection vendor, `7abe01e9` attribute contract, `983885ff` StorefrontShortcut rename, `189af6b9` vendor email gate.
- 2026-10-16 — §7 harvest tooling (aggregator, runner, spec, report) built but never committed; superseded before landing.
- 2026-10-16 — §8 rebuild: 3 legacy batches + 2 demo products merged into `data/products.json` (34 items; Title Case attribute keys; size-chart rows keyed by each category's own columns; current DB prices/flags baked in; duplicate jeans title dropped). New single importer `seed-products.ts` resolves brands/categories/vendors from the seeded foundation and writes through `ProductService.createProduct`, idempotent by name, with `--dry-run`. Legacy seeders, batches, `seed:3p`/`clean:reseed` scripts and the uncommitted harvest tooling deleted; master seed rewired to the single importer; `seed:products` script added.
- 2026-10-16 — Verification: new spec 8/8; api typecheck at baseline (29 TS7030 + 1 pre-existing TS2339; spec-config errors unchanged); live dry-run = 10 validated / 24 already present (no DB writes).
