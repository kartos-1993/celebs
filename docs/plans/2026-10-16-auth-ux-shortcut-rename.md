# Post-Seed Hardening: Auth UX, Naming, Contract, Vendor Gate

Branch: `fix/auth-ux-and-shortcut-rename` (from `fix/seed-service-parity` @ `aec5b110`)

## Decisions (user-confirmed)

- Sign-out: inline notice on login (recommended option); sessionStorage key `auth_notice`.
- QuickFilter → **StorefrontShortcut** rename across DB/API/web-admin/mobile (pre-production, no aliases).
- Harvest: aggregate-from-batches; scope men+jewelry; overwrite semantics for re-seeding; delete dead code; email gate **submit + resubmit**.
  -not used" notice on login after intentional sign-out… (consolidates #5 from review)
- Aliases stay; infinite fetch guard fixes; `getCategorySchemaFields` (P2) stays.

## Commits

- [§1] Logout/session correctness + dead-code removal + tests
- [§2] List-page loading skeletons (category, option-sets, vendors, finance)
- [§3] Attribute contract: extend zod attributeSchema with `variantType`/`optionSetName`, normalize seed writer, tests
- [§4] Brothers Collection vendor seed parity
- [§5] Vendor email-verification gate (submit/resubmit) + wizard banner
- [§6] QuickFilter → StorefrontShortcut rename (schema+migration, api module, shared-types, web-admin, mobile, seed no-op prune)
- [§7] Harvest aggregator + missing-attrs report (analysis tooling; bulletproof parsing)
- [§8] Seed enrichment + quick filter seeding (needs harvest report review — build tooling first, run it, then data)
- [§9] docs execution log

## Notes

- `taskManager` not in this session's tool set; section log is in §9/doc.
- New branch must contain the plan doc commit first (project convention).
- pg adapter warns when DATABASE_URL missing; seed stats scripts must not blow up on the warn noise (filter WARN lines).
