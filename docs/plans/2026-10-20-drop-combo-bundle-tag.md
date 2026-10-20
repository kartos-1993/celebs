# Drop unused `ComboBundle.tag`

Date: 2026-10-20
Branch: `chore/drop-combo-bundle-tag`
Status: done (Supabase migration pending approval)

## Why

After removing `Product.tags`, a deep scan found a second, unrelated `tag` field on
`ComboBundle`. It is a single category slug (`abroad-travel`, `festive`, `style-pack`,
`general`), not the old free-form product tag array, but it is only half-built.

Evidence:

- `ComboBundle.tag` was introduced with the combo engine in `a931a91b`.
- API filters active combos by it (`GET /combos?tag=` —
  `combo.controller.ts:18`, `combo.repository.ts:4-6`) and writes it on create/update
  (`combo.service.ts:115,149`).
- Web-admin has a “Category Tag” select (`combo-form-page.tsx:166-176`), tag badges in
  the table/cards, and two tag-based stat cards.
- Mobile has optional `tag` plumbing in `getCombos`/`useCombos`/`ComboBundleData`, but
  the only caller (`ComboBundleShowcase`) calls `useCombos()` with no tag. The storefront
  never filters or displays combo categories.
- `seed-combos.ts` never sets `tag`.
- Local `celebs_test` has 0 `ComboBundle` rows. Supabase development has 4 rows, all with
  `tag = NULL`.
- No test exercises the tag filter.

Conclusion: no data uses it, no storefront behavior depends on it, and the admin UI is the
only real consumer. Keeping it would preserve dead code and a second “tag” concept right
after removing the first.

## Scope

- **API**: remove the `?tag=` query param, repository filter, cache-key variation, and
  create/update writes. Old clients sending `?tag=` are unaffected: Express ignores the
  unknown query and the endpoint returns all active combos.
- **Contracts**: remove `tag` from `ComboBundleType` and `createComboSchema`.
- **Web-admin**: remove the form field/state/payload key, the table column, and the card
  badge. Replace the two tag-based stat cards with real counts (Total / Active / Draft)
  and search by title or slug instead of tag.
- **Mobile**: remove optional `tag` from `COMBO_QUERY_KEYS.list`, `getCombos`,
  `useCombos`, and `ComboBundleData`.
- **DB**: remove `tag` from `schema.prisma`; add a migration that drops
  `ComboBundle.tag`.
- **Tests**: update combo fixtures; run the combo API tests, typechecks, shared-types
  build, and mobile home/combo tests.
- **Local test DB**: apply with `prisma db push` against `.env.test`; deploy Supabase
  after approval, a snapshot, and a migration-status check. The column is nullable and
  every current value was `NULL` before the drop.

## Out of scope

- Unrelated `tag` concepts: OpenAPI route tags, the combo savings-banner `Tag` icon,
  super-deals discount labels, product `renderTag` (ETag), and the already-removed
  `Product.tags`.
- No broader marketing-page redesign beyond replacing tag-dependent stats/search.

## Rollback

Code revert restores the previous behavior. The column drop is irreversible without
re-adding it; all current values are `NULL`, so no data is lost. Take a Supabase snapshot
before deploying the migration.

## Verification

- `pnpm --filter @celebs/shared-types build`
- API: `pnpm --filter api typecheck` and the combo module tests
- Web-admin: `pnpm --filter web-admin typecheck`
- Mobile: `pnpm --filter mobile typecheck` and the home combo tests
- Local DB: `information_schema.columns` no longer lists `ComboBundle.tag`
- Prisma Client generated with no `ComboBundle.tag` field

## Result

- Commits: `5d953d65` plan, `232d99c8` code/contracts/admin/mobile, `77491875`
  schema + migration.
- Local `celebs_test`: `db push` applied; `information_schema.columns` has no
  `ComboBundle.tag`; 0 combo rows at verification time.
- Prisma Client v7.2.0 regenerated; the generated `ComboBundle` model has no `tag`.
- API combo tests: 6/6 passed.
- Mobile home tests: 28/28 passed.
- Shared-types build passed; shared-types tests 99/99.
- Web-admin typecheck passed; mobile typecheck passed.
- API typecheck still reports the existing unrelated baseline (30 app errors, 37 spec
  errors, none in combo).
- Supabase deployment completed 2026-10-20: both `20261019141759_drop_product_tags`
  and `20261020130000_drop_combo_bundle_tag` applied on the direct 5432 URL;
  `migrate status` reports the schema up to date.
- Pre-drop snapshot at
  `C:\Users\Abishek Shrestha\AppData\Local\Temp\opencode\supabase-tag-drop-20261020`:
  36 full product rows (all with non-null `Product.tags`), 4 full combo rows (all
  `tag = NULL`), column definitions, and migration history.
- Post-drop: both columns absent; counts unchanged (36 products / 4 combos); an
  app-level read returned a product and a combo.
- No push/PR.
