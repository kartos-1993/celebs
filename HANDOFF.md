# Handoff: Celebs courier-settlement work

Written by Claude Code (Opus 5, build mode). Read this whole file before touching
anything. The reasoning is included deliberately — a lot of the non-obvious
decisions here were arrived at by measuring a third party, and re-deriving them
will produce wrong answers that look right.

---

## 0. TL;DR for the next agent

The user's goal is a trustworthy marketplace money system: exact ledger, commission,
seller earnings, **delivery priced by the real courier per seller**, split dispatch,
settlement hardening, then payouts and returns.

Two things dominate everything:

1. **Money is `Decimal` end to end.** No floats on any money path, ever. This is
   the user's hard rule.
2. **The courier is the source of truth for delivery cost.** Hand-entered rate
   bands are gone from pricing. The remaining work is _split dispatch_ — we now
   quote per seller but still create one consignment per order.

**The most dangerous open item is the remote database's migration history.** See
§6. It is genuinely broken and easy to make worse. Do not run anything against
remote until you have read that section.

---

## 1. Repo state

```
repo:    C:\celebs\celebs
branch:  feat/courier-settlement-ledger
HEAD:    12a7b8c7  fix(db): repair migration for a database with no logistics objects
nothing pushed to any remote
4 stashes — DO NOT TOUCH, they predate this work and are unrelated
```

Package manager is **pnpm**. `npm install` fails on `workspace:*` protocol.

### Uncommitted work in the tree right now

```
?? apps/api/src/modules/logistics/cod-allocation.ts
?? apps/api/src/modules/logistics/__tests__/cod-allocation.spec.ts
```

This is the **start** of split dispatch. See §7. The spec was written and the
implementation written, but **the test was never actually run** — the run was
interrupted. Run it first. See §7 for what I expect and what I suspect is wrong.

### Verification commands

```bash
# API (the one that matters). ~158 files / 1112 tests, takes several minutes.
cd apps/api && npx vitest run

# Targeted, while iterating
cd apps/api && npx vitest run src/modules/logistics --reporter=basic

# Typecheck BOTH configs — a change can pass app and fail spec.
cd apps/api && npx tsc -p tsconfig.app.json --noEmit
cd apps/api && npx tsc -p tsconfig.spec.json --noEmit

# Lint
cd apps/api && npx eslint src tests --max-warnings=0

# Whole monorepo
npm run typecheck    # must be "10 successful, 10 total"
```

Latest verified state at HEAD: **API 158 files / 1112 tests, root typecheck 10/10,
API lint clean.**

---

## 2. Money rules (the user's hard constraint)

- PostgreSQL `Decimal`, Prisma `Decimal`, API `Decimal`, **wire format strings**.
- Clients compute in **whole paisa integers** (`packages/shared-utils/src/utils/money.ts`).
- Never round-trip money through `number`/`parseFloat`/`toNumber()` on a
  computation path. Lint guards exist but are **not exhaustive** — they ban
  `Number(x)`/`parseFloat(x)` on identifiers matching money-ish names. They do
  _not_ catch `Number(memberExpr)`, or `toNumber()` on a nested field.
- **Rounding is half-up, written explicitly.** `apps/api/src/modules/logistics/money.ts`
  has `money()` with `ROUND_HALF_UP` passed explicitly rather than relying on
  Decimal.js's default. That default is a library behaviour that can change on an
  upgrade; a money rule that changes on a dependency bump is not a rule.
  Commission code uses its own `COMMISSION_RATE_DECIMALS` (4) for rates and 2 for
  amounts.
- `sellerNetAmount = subtotal - commissionAmount`. **Never** recompute as
  `subtotal * (1 - rate)` — that reintroduces float drift.
- The customer charge and the courier's cost are **separate numbers** everywhere
  (`customerCharge` vs `courierCost` in `delivery-policy.ts`). Collapsing them is
  how a free-delivery threshold becomes free money.

---

## 3. Product decisions (user-confirmed, do not relitigate)

- **Seller lists the final customer price.** Commission is deducted from it.
- Commission scopes: `GLOBAL` ships; `CATEGORY`/`VENDOR` schema-supported, UI inert.
  Precedence: vendor → subcategory → category → global.
- `COMMISSION_MANAGE` is **SUPERADMIN-only**. ADMIN deliberately does _not_ have it.
- **Celebs is one Pathao merchant with one approved pickup store.** Sellers are NOT
  Pathao stores. Goods are collected as one pickup from ours.
- Same seller's lines **merge into one parcel**. Different sellers are **quoted and
  charged separately**. This is the whole point of the current work.
- Delivery has **zero platform margin**. Courier `final_price` passes through.
- COD handling (Pathao 1%) is **disclosed and passed through at cost**, never marked up.
- Customer checkout price is **locked**. Dispatch re-quotes only for platform cost
  variance; customers are never repriced.
- Free-delivery threshold and COD ceiling remain **ours** (commerce policy / zone).
  They apply _to_ the courier's number rather than replacing it.

### Returns (decided, not built)

3-day window from delivery. Reasons only `DAMAGED`, `WRONG_SIZE`, `WRONG_COLOUR`.
Customer arranges and pays return shipping. Refund only after Celebs receives the
item. Original delivery fee never refunded. Commission fully reverses. Seller
return-rate scoring deferred. Post-payout exposure uses reserve, platform
absorption/alert as fallback. Recorded in codebase-memory, not in a repo file.

### Permissions

| Role       | Has                                                         |
| ---------- | ----------------------------------------------------------- |
| SUPERADMIN | everything                                                  |
| ADMIN      | `FINANCE_PLATFORM_VIEW/MANAGE`, **not** `COMMISSION_MANAGE` |
| VENDOR     | shop-scoped `FINANCE_VIEW` (own earnings only)              |
| STAFF      | none of the above                                           |

---

## 4. Pathao facts — MEASURED, do not re-derive from docs

The PDF is a **Merchant API** doc, not the consumer app. The user's later-supplied
`client_secret` was **different from the low-res PDF transcription**, and the
transcription was wrong. That cost real time.

- Price-plan inputs: `store_id`, `item_type`, `delivery_type`, `item_weight`,
  `recipient_city`, `recipient_zone`. **Quantity is NOT a pricing input.**
  Measured: `item_quantity=25`, `item_weight=0.5` charged the same 0.5 kg rate
  (140). **There is no volumetric/dimension input at all.**
- Use `final_price`, not `price`. They differ at low weights (115 vs 120).
- Real weight limits are **0.001–200 kg** (docs claiming 10 kg are stale). Price
  plan accepted 150 kg happily.
- `amount_to_collect` is **integer-only**.
- COD detail: delivery 160 + cod_fee 15 = total 175 on collection 1500.
  So `cod_fee = 1% of amount_to_collect`.
- **`cod_percentage: 0.01` is a FRACTION (1%), not a percentage value.** Getting
  this wrong cost a factor of 100 — a test caught 0.12 where the courier charges
  11.50.
- Single `POST /orders` returns consignment id + fee **synchronously**. Bulk returns
  `202`, gives **no IDs**, and cannot be polled (`GET /orders` unauthorized). So
  **one order call per seller** is the only way to get tracking numbers.
- An **unknown `zone_id` returns a _successful, wrong_ price.** Measured:
  `zone_id: 999999` → price 150, plan 174, code 200 (the Pokhara rate). This is why
  `courier-destination.repository.ts` exists and refuses.
- Rates are **non-monotonic** and destination-dependent: 0.9 kg is **150 to
  Pokhara, 210 to Bardibas**. Never derive a rate; always call.
- City ids duplicate: Pokhara appears as 79, 81, 148.
- `GET /cities/{id}/zone-list`, `GET /zones/{id}/area-list`.
- Sandbox tokens last 90 days.
- Sandbox store id `130903`. A test origin store was created pending approval.

### Live blocker

`POST /aladdin/api/v1/issue-token` on live returns
`{"message":"The user credentials were incorrect","type":"error","code":400}` when
given the sandbox username. **Needs the merchant portal login email/password from
the user.** No live orders were ever created.

---

## 5. What is already built (don't redo)

### Delivery quoting — DONE

```
apps/api/src/modules/logistics/
  delivery-policy.ts          customerCharge vs courierCost vs codHandlingFee vs absorbedCost
  delivery-quote.service.ts   per-seller quote, cache key includes destination, single-flight
  delivery-quote.cache.ts     Redis cache, TTL 3600, swallows all failures
  courier-destination.repository.ts   refuses unresolvable/unsynced destinations
  seller-parcels.ts           merges same-seller lines into one parcel, sorted by vendorId
  money.ts                    money() = half-up to 2dp (shared, was copy-pasted 3×)
  cod-allocation.ts           UNCOMMITTED — see §7
```

`DeliveryQuote` deliberately does **NOT** compute `codHandlingFee` or
`collectibleAmount`. `applyDeliveryPolicy` owns those. Two owners of one money
number is a double-count waiting to happen, and they disagreed whenever a
free-delivery threshold waived the charge.

### Checkout — DONE, uses the courier

`checkout.service.ts` resolves the address → courier ids, builds seller parcels,
quotes, applies policy. Records `COURIER_QUOTE` as `deliveryPricingSource`, plus
`courierFee`, `absorbedShippingCost`, `codHandlingFee`, `amountToCollect`.

An unresolvable destination is refused with a **400** and a customer-actionable
message (not a 500).

### Cart — DONE, uses the courier, never fails

`DeliveryPreviewService` quotes the courier; on any courier problem it falls back
to the **flat policy fee** (deliberately _not_ a rate band) and sets
`isEstimate: true`. The free-delivery threshold applies on **both** paths — a bug
I introduced and an integration test caught.

### Money hardening — DONE

Decimal everywhere; `IPaymentGateway.amount` takes `Decimal`; `Product.packageWeightKg`
is `Decimal(8,3)`; payment gateways and `logistics.service.ts` no longer cast to
`Number`. Mobile cart totals, combo percentages, discount badges, threshold/COD
comparisons use paisa helpers.

### Commission/ledger/earnings — DONE

`CommissionRule` effective-dated; `OrderItem` snapshots rate/amount/net; per-line
`COMMISSION` ledger entries with `vendorId`; `GET /finance/earnings`;
refund reverses commission proportionally and capped;
web-admin Commission + Earnings screens; seller net calculator beside the price field.

---

## 6. ⚠️ THE MIGRATION SITUATION — read carefully

### 6.1 Two databases, wildly different states

|                                           | local `celebs_test`         | remote Supabase (dev+staging, shared) |
| ----------------------------------------- | --------------------------- | ------------------------------------- |
| history table                             | present (back-filled by me) | present, **partly false**             |
| logistics tables                          | all 4 present               | **all 4 ABSENT**                      |
| `DeliveryPricingSource` enum              | present                     | **ABSENT**                            |
| `Order` delivery columns                  | present                     | **ABSENT** (6 of them)                |
| `CommissionRule`, `LedgerEntry.vendor_id` | present                     | present                               |
| 47 expected tables                        | 47                          | **44**                                |

`.env.development` points at the **remote**. `.env.test` points at local. The remote
is the canonical dev/staging DB and the user authorised migrating it. **Tests must
only ever touch local.**

### 6.2 Why remote is broken

`_prisma_migrations` records `20250101000000_baseline_full_schema` as applied, but
its DDL **never ran there**. That DB was built from an older migration lineage
(`20250422044547_init`, several `*_auto`, etc. — none of which exist locally
anymore), and the squashed baseline was later marked applied against it.

Everything _after_ the baseline applied cleanly (commission rules, `vendor_id`),
which is exactly why this stayed invisible. It only surfaces when something asks
for a delivery location or a courier quote, and it fails as
`type "DeliveryPricingSource" does not exist` rather than "never migrated".

### 6.3 What I did, and what is NOT done

Added `apps/api/src/db/migrations/20261007500000_logistics_location_repair/migration.sql`.
Every statement is guarded (`IF NOT EXISTS` / `pg_type` / `pg_constraint` checks) so
it repairs a drifted DB and is a **verified no-op** on a correct one. Verified
no-op on local; suite stayed green.

Dated **before** `20261008000000_courier_quote_pricing_source` on purpose: that
migration does `ALTER TYPE "DeliveryPricingSource" ADD VALUE 'COURIER_QUOTE'`, so
the enum must exist first. On remote the two now apply in the right order.

**It has NOT been applied to remote.** Nothing has been applied to remote since.

The same drift diff also surfaced, and I **deliberately excluded**:

```
DROP COLUMN "Address"."is_deleted"
DROP COLUMN "CommissionRule"."updated_at"
ALTER COLUMN "Session"."expiredAt" SET DEFAULT ...
ALTER COLUMN "IdempotencyKey"."expiresAt" SET DEFAULT ...
```

The two dropped columns exist **only on remote**, from the older lineage, and hold
data. A database being behind is a reason to add what is missing, never a licence
to delete what we did not put there.

### 6.4 🔴 THE TRAP I ALMOST FELL INTO — Prisma skips rolled-back migrations

I ran `migrate deploy` against remote, it failed on the missing enum, and I "cleaned
up" with:

```
prisma migrate resolve --rolled-back 20261008000000_courier_quote_pricing_source
```

**That was the wrong instinct.** `migrate deploy` treats a rolled-back row as
already applied and **will never re-apply it**. So remote would silently never get
`cod_handling_fee`, `amount_to_collect` or `COURIER_QUOTE`, while the history claims
they are done — i.e. I would have created a _new_ false-history entry while fixing
the old one.

Current remote history (last rows):

```
20261004000000_settlement_statement_received_at   finished=false rolledBack=true
20261004000000_settlement_statement_received_at   finished=false rolledBack=true   <-- duplicate!
20261006000000_commission_rules_and_line_snapshot finished=false rolledBack=true
20261006000000_commission_rules_and_line_snapshot finished=true  rolledBack=false
20261007000000_ledger_vendor_attribution...        finished=true  rolledBack=false
20261008000000_courier_quote_pricing_source       finished=false rolledBack=true   <-- MY ROW
```

`migrate status` on remote currently reports **only** `20261007500000_logistics_location_repair`
as pending. `20261008000000` is invisible to it.

### 6.5 What still has to happen on remote (user wanted this fixed — was in progress)

The fix is to **delete the rolled-back row for `20261008000000`** so `migrate deploy`
applies it for real, then deploy. Something like:

```sql
DELETE FROM _prisma_migrations
WHERE migration_name = '20261008000000_courier_quote_pricing_source'
  AND rolled_back_at IS NOT NULL;
```

then

```bash
# from repo root, with .env.development loaded into the environment
npx prisma migrate deploy --schema apps/api/src/db/schema.prisma
```

which should then apply, in order:
`20261007500000_logistics_location_repair` → `20261008000000_courier_quote_pricing_source`.

**Then verify, and prove nothing was dropped:**

```bash
npx prisma db pull --print --schema apps/api/src/db/schema.prisma > /tmp/remote-after.prisma
diff /tmp/remote-before.prisma /tmp/remote-after.prisma
```

A `before` snapshot is at `/tmp/remote-before.prisma` (1077 lines) but **regenerate
it** — `/tmp` may not survive. Expect diffs _only_ for: the 4 logistics tables, the
2 enums, the 6 Order columns, `Address.logistics_zone_id`, `OrderItem.billable_weight_kg`,
plus indexes/FKs. **Anything else appearing in the diff is a red flag — investigate
before accepting.**

Also confirm the legacy columns still exist afterwards:
`Address.is_deleted` and `CommissionRule.updated_at` must still be present.

Pre-existing mess to be aware of but **not** part of this task: remote has duplicate
rolled-back rows for `20261004000000` and `20261006000000`. Don't try to tidy those
as a side effect.

---

## 7. Split dispatch — the next real task (UNCOMMITTED START)

### The problem

Checkout now quotes **one courier fee per seller**. Dispatch still creates **one
consignment per order**. So a two-seller order is billed for two pickups and only
one is booked. That is a live money bug.

### What I had written

`cod-allocation.ts` + spec, both untracked. `allocateCollection({ total, parts })`
splits one customer-collectible total across N consignments so the parts **sum back
to the total exactly**.

Why it must be exact: the customer is told "collect 1363.50" and hands over
1363.50. If our consignments add to 1363.49 the courier is a rupee short against a
customer who already paid us in full.

Algorithm: floor each share to whole paisas, then hand out leftover paisas
**largest-remainder first, ties broken by key** (not arrival order — a courier's
collection changing because the DB returned rows differently is unexplainable to a
customer). Handles: negative total → zero everywhere; zero weights → even split;
stable under input reordering.

### What I suspect is wrong — CHECK THIS FIRST

I wrote an over-engineered first version with a helper
`giveRemainderToLargest` that **gave all leftover paisas to the single top-ranked
share** — wrong when leftover > 1 paisa. I rewrote it to hand out one paisa at a
time across ranked shares. **I rewrote it but never ran the test.** The last command
I issued produced no output before being interrupted.

Run `cd apps/api && npx vitest run src/modules/logistics/__tests__/cod-allocation.spec.ts`
first and believe the result over my description.

Also: `cod-allocation.ts` still has a pointless trailing `export { ONE_PAISA }`
(re-exporting an unused constant) and imports `MONEY_PLACES` nowhere — clean both up.

### The allocation weight — a real decision needed

Each consignment collects: **that seller's goods + its share of delivery + its share
of COD handling.**

The share of delivery is the genuinely debatable part. Options:

- proportional to each parcel's **courier cost** (my instinct — proportional to what
  we actually pay)
- proportional to **declared weight** (what the courier prices on)
- proportional to **goods value**

**Recommendation: courier cost.** The customer's delivery charge exists because of
the parcels; splitting it by what each parcel costs the courier is the only split
where "the customer paid 360, we owed 150 + 210" reconciles cleanly. Whatever is
chosen, the spec must prove `sum(consignments) == order.totalAmount` exactly, and
that must hold at COD ceiling boundaries.

### Then

1. `Consignment` table + migration: `orderId`, `vendorId`, `trackingNumber`,
   `trackingUrl`, `courierFee`, `amountToCollect`, `codAmount`, `status`.
   One row per seller parcel.
2. `Order` keeps a summary (joined tracking numbers) so existing order screens and
   emails don't break.
3. `logistics.service.ts` `dispatchOrder` loops seller parcels, one synchronous
   Pathao `POST /orders` each, writing one `Consignment` each.
4. **Idempotency/CAS**: dispatch must not create duplicates on a double tap or a
   retry. Partial failure (2 of 3 consignments created) needs a defined state.
5. Update `COD` settlement to reconcile per consignment, not per order.

### Note on the existing adapter

`logistics.service.ts` currently supports `NEPAL_CAN_MOVE` and `MANUAL`. Pathao
**order creation** (not just price) is not implemented yet — only the price-plan
client. That needs building: `POST /orders` with the measured payload shape.

---

## 8. Remaining backlog, in the order I'd do it

1. **Finish §7 split dispatch.**
2. **Settlement CAS** — `markPaid`/`reconcile` in
   `apps/api/src/modules/finance/settlement/settlement.service.ts` still has a
   transition map but **no compare-and-swap inside a bounded transaction**. Two
   concurrent calls can both pass the transition check. Also bound transactions
   with `{ maxWait: 5000, timeout: 10000 }`.
3. **Commission rule publishing concurrency** — `commission.service.ts` finds current
   rules then closes/creates inside a transaction with no DB uniqueness guarantee.
   Two concurrent publishes can create two `current` rules. Needs a partial unique
   index or a lock.
4. **Mobile money types** — arithmetic is already exact via paisa helpers, but
   `packages/shared-types/src/types/cart.ts` still declares `shippingFee: number`
   etc., and `CartItemHydrated.price` is a `number`. Changing to strings is a
   breaking contract change across mobile. **Partially done, do not assume finished.**
5. **Retire `ShippingRate.fee` / `codFee`** — still in the schema, no longer used for
   pricing. Do NOT drop the tables on remote (see §6.3).
6. **Seller earnings on mobile.**
7. **Payouts** — `availableBalance`/`withholdingEscrow` are unused stubs. Returns
   depend on payouts.
8. **Returns** — nothing built. See §3.
9. **Admin UI gaps**: no "open settlement batch" button (API `POST /finance/settlements`
   exists), no courier filter, no previous-page controls on earnings.
10. **Live Pathao token** — blocked on the user.

---

## 9. Repo conventions you must not break

From `apps/api/AGENTS.md`:

- **Thin controllers (<40 lines)**, `sendSuccess`/`sendCreated`/`sendPaginated`
  only. Never bare `res.json({...})`. Every success needs `success: true`.
- **Zero Prisma in services.** DB access goes in repository classes. Don't leave
  unused `import prisma`.
- **Zero transaction loops** — Supabase PgBouncer transaction mode (port 6543) holds a
  physical connection for the whole interactive transaction. Use `createMany` /
  batch updates / CTEs.
- **Bounded transactions**: `{ maxWait: 5000, timeout: 10000 }`.
- **Deterministic lock order**: sort by unique id before entering a transaction
  (`[...items].sort((a,b) => a.inventoryId.localeCompare(b.inventoryId))`) to
  eliminate `40P01`.
- `findUniqueOrThrow` for entities already proven to exist; don't leak `null` into
  services.
- No `| null | undefined` in downstream service signatures to silence the compiler.
- Plural REST nouns, standard verbs, no backward-compat shims pre-production.
- Tests: local `celebs_test` only. Hash passwords with `hashValue` in fixtures.
- Migrations: DDL needs **port 5432 direct**, never the 6543 pooler.

`prisma.config.ts` resolves the schema as `./apps/api/src/db/schema.prisma` when run
from repo root, `./src/db/schema.prisma` in Docker. It does **not** auto-load `.env`
files — you must source the env yourself.

---

## 10. Mistakes made in this work — don't repeat them

Mine:

- Ran `migrate` against the **remote** before checking what `.env.development`
  pointed at. Always verify which database, print the host and port.
- Used `npm install` in a **pnpm** workspace.
- Claimed a low-res PDF transcription was "character-perfect". It wasn't, and the
  wrong `client_secret` blocked courier auth.
- Wanted to backfill `LedgerEntry.vendorId`. That would be a **guess about money**.
  Left `NULL`; "not attributable" is the honest value.
- Wrote my own test arithmetic wrong twice (`37.49` should be `37.50`). The
  implementation was right both times. Verify expected values by hand.
- Wrote a COD free-delivery expectation that was economically wrong ("free delivery
  means no handling charge"). The customer still collects the goods, so the courier
  still charges 1%. I overwrote the test with the correct reasoning.
- Introduced a fallback path that ignored the free-delivery threshold — reintroducing
  the very bug the work exists to remove. An integration test caught it.
- Single-flight had an `await` between the in-flight check and the in-flight set,
  so all 20 concurrent callers passed the check. 20 calls instead of 1.
- Used `migrate resolve --rolled-back` to "clean up", which would have created a new
  false-history entry. See §6.4.
- Ran `migrate diff` and nearly shipped two `DROP COLUMN`s that hold data.
- Built a verification query that filtered `table_name='Address'` and produced a
  false alarm; I'd also misremembered a truncated tsc error. **Confirm a table's
  physical name before concluding a column was dropped.**
- Renamed `billableWeightKg` → `declaredWeightKg` but the _callers_ still had to
  change; the name was quietly inviting a volumetric max. Naming is a real control.

The repo's:

- `celebs_test` had **no `_prisma_migrations` table at all** (built directly), so
  `migrate deploy` failed `P3005` and wanted to reset the schema. I verified each
  earlier migration's distinctive objects were present, then back-filled history
  with `migrate resolve --applied`. **Verify before marking applied** — that mistake
  is what remote's history already is.
- Local `celebs-auth` has never had migration history; `migrate dev` there wants to
  reset everything. Don't run `migrate dev` against it.

---

## 11. Explicitly out of scope / do not touch

- The 4 stashes.
- Remote legacy columns `Address.is_deleted`, `CommissionRule.updated_at` — data, and
  not ours to delete.
- Remote's older migration-lineage rows (`2025*`, `*_auto`) — Prisma warns they're
  not found locally. Expected. Do not "tidy".
- No live Pathao orders. Ever, without explicit instruction.
- Payout jobs and returns are **not** started; don't stub them into the dispatch work.
