# Drop unused `ComboBundle.tag`

Date: 2026-10-20
Branch: `chore/drop-combo-bundle-tag`
Status: implementation

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
- **Local test DB**: apply with `prisma db push` against `.env.test` only. Supabase
  deployment remains pending explicit approval; the column is nullable and every current
  value is `NULL`.

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
- API: `pnpm --filter @celebs/api typecheck` and the combo module tests
- Web-admin: `pnpm --filter @celebs/web-admin typecheck`
- Mobile: `pnpm --filter @celebs/mobile typecheck` and the home combo tests
- Local DB: `information_schema.columns` no longer lists `ComboBundle.tag`
- Prisma Client generated with no `ComboBundle.tag` field
