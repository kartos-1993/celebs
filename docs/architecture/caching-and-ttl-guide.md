# Caching & TTL Guide — Redis (L2) vs Server Memory (L1)

> Audience: anyone new to the Celebs backend. Start here before touching
> anything under `apps/api/src/common/services/`, `config/upstash.redis.ts`,
> or the queue/worker files. All file references are relative to the repo root
> and were verified against the codebase when this guide was written.

---

## 1. The 30-second version

Redis is a dictionary that lives in RAM: `key → value` pairs, sub-millisecond
reads/writes, keys can auto-expire. This codebase uses it for three things:

| Use                 | Example keys                                      | Why not Postgres?                                                                    |
| ------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Sessions**        | `celebs_sess:<id>`                                | Read on every logged-in request — would drown Postgres in tiny lookups               |
| **Cache**           | `storefront:home`, `combos:active`, `cart:sync:*` | Photocopies of expensive answers; Postgres computes once, Redis serves copies        |
| **Queues** (BullMQ) | `bull:<queue>:wait/active/delayed/…`              | Needs atomic pop, priorities, retries, cron — a DB table can't do this without locks |

**TTL** (time-to-live) answers one question per key: _"how stale may this be?"_
Login convenience tolerates 24 h sessions; merchandising tolerates a
10-minute-old homepage; cross-instance drift tolerates 60 s. The table in
§4 lists every TTL and where to change it (code change + deploy — TTLs are
not runtime knobs).

---

## 2. Layer diagram — where a read goes

```
                          ┌─────────────────────────────┐
     HTTP request ──►     │  L1 — server memory (Map)   │  per-process, 60 s,
                          │  apps/api/.../ttl-cache.ts  │  zero commands
                          └──────────────┬──────────────┘
                                  miss   │   ▲ refill (60 s copy)
                                         ▼   │
                          ┌─────────────────────────────┐
                          │  L2 — Redis (Upstash)       │  shared, EX seconds,
                          │  SET key value EX <ttl>     │  1 GET / 1 SET
                          └──────────────┬──────────────┘
                                  miss   │   ▲ write-back (SET EX)
                                         ▼   │
                          ┌─────────────────────────────┐
                          │  Postgres (truth)           │  joins, transactions,
                          │  via repositories           │  never skipped for writes
                          └─────────────────────────────┘
```

Three paths, three costs:

| Path      | Commands                          | Example                                                |
| --------- | --------------------------------- | ------------------------------------------------------ |
| L1 hit    | **0**                             | Repeated banner reads within 60 s on the same instance |
| L2 hit    | **1 GET**                         | Homepage visit, `storefront:home` younger than 10 min  |
| Full miss | **1 GET + 1 SET** + Postgres work | First visit after expiry/admin edit                    |

Two caches in this repo have **no L1** (raw Redis only): `storefront:home`
(`redis-cache.service.ts`) and sessions (`session-store.ts`). Everything
through `TtlCache` gets both layers.

---

## 3. How expiry works in each layer (the core of this guide)

### 3a. Redis TTL — enforced by the server, free, silent

`SET storefront:home <json> EX 600` stores the value **plus a death
timestamp**. After 600 s Redis deletes the key itself (lazily on access +
active background sampling). **No worker, no cron, no polling, zero commands
spent deleting.** Expiry is a safety net for "everyone forgot this key";
deliberate changes use `DEL` immediately (see §6).

### 3b. Server-memory TTL — enforced by one `if` statement

`TtlCache` keeps `{ data, expiresAt }` in a plain `Map` (`ttl-cache.ts:5-10`)
and on read compares timestamps (`ttl-cache.ts:35`):

```ts
if (local && local.expiresAt > now) return local.data; // fresh — 0 commands
```

Stale entries are ignored and overwritten on refill — nothing is "deleted."
Consequences:

- **Per-process only.** Web (`main.ts`) and worker (`worker-main.ts`) each
  have their own `Map`; two web instances have two copies.
- **Dies with the process.** Restart/deploy wipes L1; it refills from L2,
  then Postgres, on demand.
- **60 s max drift across instances** (`ttl-cache.ts:17-19`) — acceptable
  for merchandising data, stated in the file header.

### 3c. What BullMQ `delayed` is NOT

BullMQ's `delayed` drawer looks like a TTL ("wake me later") but is a
**sorted list of timestamps that workers must keep checking**
(`ZRANGEBYSCORE delayed …` in every poll). Redis TTLs clean themselves;
BullMQ delays need a guard on patrol. That patrol is the background command
burn (see §7) — caches never cause it.

---

## 4. TTL inventory — every knob in the system

| Key                                                       | Layer                                   | TTL                         | Written where                                                                          | Deleted early by                                                  |
| --------------------------------------------------------- | --------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `celebs_sess:*`                                           | L2 only                                 | **24 h** (`86400`)          | login — `apps/api/src/config/session-store.ts:27`                                      | logout (`DEL`), expiry                                            |
| `storefront:home`                                         | L2 only                                 | **10 min** (`600`)          | first miss — `apps/api/src/modules/storefront/storefront.service.ts:144`               | banner/campaign/combo/settings edit → `DEL`                       |
| `campaigns:active`, `combos:active/all`, `banners:active` | L1 60 s + L2 300 s (`TtlCache` default) | **60 s / 5 min**            | `apps/api/src/common/utils/ttl-cache.ts:29,43,57`                                      | `invalidate()` → L1 clear + L2 `DEL`                              |
| platform settings                                         | hand-rolled L1+L2                       | short L1, one shared L2 key | `apps/api/src/modules/platform-settings/platform-settings.repository.ts`               | setting updates                                                   |
| `cart:sync:<user>:<session>`                              | L2 only                                 | **24 h**                    | after merge — `apps/api/src/modules/cart/cart.service.ts:394`                          | expiry                                                            |
| push-token sets (`user:push-tokens:*`, `all:push-tokens`) | L2, **no expiry**                       | forever                     | login/device register — `apps/api/src/modules/notification/notification.repository.ts` | logout (`SREM`), invalid-token sweeps                             |
| BullMQ job data                                           | lifecycle-managed, **not TTL**          | —                           | job creation                                                                           | `removeOnComplete` deletes; failures kept (`removeOnFail: false`) |

Session middleware tuning that controls the bill (`apps/api/src/app.ts:206-207`):
`resave: false` (never rewrite unchanged sessions) and
`saveUninitialized: false` (never create sessions for strangers — health
checks and anonymous browsing cost zero Redis).

---

## 5. Lifecycle flows (request → Redis → response)

### 5a. Anonymous homepage visit (cache-aside)

`storefront.service.ts:35-39` → `getCachedJson('storefront:home')` (1 GET).
Hit → return. Miss → 6 Postgres queries at once (banners, campaigns, combos,
categories, products, layout setting, lines 42-52) → assemble widgets →
`setCachedJson(..., 600)` (1 SET) → return. Admin edits later call
`invalidateCacheKey('storefront:home')` (1 DEL) from campaign/banner/combo/
platform-settings code.

### 5b. Registration → welcome email (queue round-trip)

`mail.queue.ts:28` — `mailQueue.add('send', jobData)` (~ms) → HTTP responds
immediately. The `addJob` script writes the job hash, pushes `wait`, rings
the `marker` doorbell. The mail worker wakes instantly, runs `sendEmail`,
then: success → `moveToCompleted` + hash deleted (`removeOnComplete: true`);
SMTP blip → `moveToDelayed` with exponential backoff (10 s base, 5 attempts
for mail — `queue.service.ts:117-121`); dead after 5 → `failed` set, kept for
replay. If Redis itself is down it sends inline instead of dropping the mail
(`mail.queue.ts:33-38`); tests always send inline (`mail.queue.ts:20-23`).

### 5c. Product photo confirm → derivatives (asset pipeline)

`media.controller.ts:153-159` — only `PRODUCT` scope enqueues
`assetQueue.add('generate-thumbnails', { assetId, key, mimeType })`, then
replies in ~200 ms. `asset.worker.ts` re-validates scope/MIME, downloads
from R2, builds zoom/card/thumb/placeholder webps with `sharp`, uploads
back. Payloads carry R2 _keys_, never image bytes — why Redis memory stays
at ~1 MB.

### 5d. Login → session life → logout

Login: `SET celebs_sess:<id> <json> EX 86400`. Each authed request: one
`GET`. No cookie (health checks, anonymous): zero Redis. Logout: one `DEL`.

### 5e. Crons with no humans (repeatable jobs)

`worker-main.ts:56-79` registers two schedules at boot with **fixed IDs**
(midnight session purge, `*/30` stale-reservation release) — re-registering
on every deploy is a dedup no-op. BullMQ fires each into `wait` when due;
workers run them (`session.worker.ts`, `order-reservation.worker.ts`).
The reservation release (`checkout.service.ts:340-382`): finds unpaid orders
older than `ORDER_RESERVATION_TTL_HOURS` (default 2 h), **verifies with the
Khalti/eSewa gateway first** (never cancel a truly-paid order), then cancels

- restocks inside guarded transactions.

### 5f. Cart double-tap guard (fail-open)

`cart.service.ts:379-398`: `GET cart:sync:<user>:<session>` → seen? return
cart without merging → else merge → `SET … EX 86400`. Both calls wrapped in
try/catch that falls through on Redis failure — a down cache must never
break a user's cart. (Contrast sessions, which fail loud — deliberate.)

---

## 6. Expiry vs invalidation vs BullMQ-delayed (don't mix these up)

| Mechanism                | Who triggers                | Who enforces                | Example                                    |
| ------------------------ | --------------------------- | --------------------------- | ------------------------------------------ |
| **Expiry** (TTL)         | passing time                | Redis server / an `if`      | `storefront:home` dies after 10 min unread |
| **Invalidation** (`DEL`) | code, on a change event     | your repository/service     | banner edit deletes `storefront:home` now  |
| **BullMQ delayed**       | worker polling + timestamps | workers, forever patrolling | retry backoff, cron firings                |

Expiry is the net for forgotten keys; invalidation is the tool for known
changes; delayed jobs are scheduled _work_, not cached _data_.

---

## 7. Failure-mode matrix (what the user sees)

| Situation                            | Sessions                                                                     | Caches                                                                                | Queues                                                                                                               |
| ------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| L1 cold (restart/deploy)             | n/a (no L1)                                                                  | slower until refill, self-heals                                                       | n/a                                                                                                                  |
| L2 (Redis) down                      | **hard fail** — auth requests 500 (`session-store.ts` passes errors through) | graceful — `null`s, pages render slower (`ttl-cache.ts:46-48`, cart guard fails open) | producers fall back (mail sends inline); workers crash-loop until back                                               |
| L2 wiped (free host, no persistence) | everyone logged out                                                          | stampede: all keys miss at once, Postgres spikes minutes, then heals                  | schedules re-register on boot; in-flight jobs recovered via lock expiry; delayed jobs due during outage fire on wake |
| 20 MB fills up                       | writes error (`noeviction`)                                                  | writes error, reads of old keys fine                                                  | `addJob` fails → producers throw/fallback                                                                            |

---

## 8. Bill cheat-sheet (Upstash counts commands, not users)

| What                                              | Cost                                                    |
| ------------------------------------------------- | ------------------------------------------------------- |
| 4 idle workers, defaults (`drainDelay` 5 s)       | ~400k/day with zero users                               |
| 4 idle workers, `WORKER_DRAIN_DELAY_SECONDS = 60` | ~35k/day, real jobs unaffected (marker wake is instant) |
| Homepage view (hit / miss)                        | 1 GET / 1 GET + 1 SET                                   |
| Logged-in API call                                | 1 session GET + endpoint's own usage                    |
| Signup + welcome email                            | ~10–15 (job lifecycle)                                  |
| Photo confirm + derivatives                       | ~10–15 (job lifecycle)                                  |
| Cart sync                                         | 2                                                       |
| Midnight purge / 30-min release                   | ~15 per firing                                          |

Idle polling dominates until real traffic arrives; sessions/caches/jobs add
roughly a few commands per user action on top.

---

## 9. FAQ (from real debugging sessions)

**Why does Redis burn commands with zero users?**
Four BullMQ workers poll empty queues forever: `BZPOPMIN` sleep →
timeout → 6-question `EVALSHA` checklist → nothing → sleep again, plus a
30 s stalled-guard script per queue. ~1 cmd/sec ≈ 400k/day once script
sub-steps are metered.

**Why can't workers just stop when queues are empty?**
"Empty now" says nothing about the next millisecond, and the checklist is
the only atomic grab — skipping it risks double-processing. The sleep
timeout (now 60 s) is the safety net for lost wake-up signals; the
stalled-guard rescues crashed workers' jobs. Patrol _is_ the job.

**Why is `asset-processing` always in the logs?**
It isn't busier — all four queues are equally empty. It shares the fast
5 s cadence with mail (vs ~10 s for session/order), so it appears twice as
often. Cadence, not workload.

**Sessions vs cache vs queue — which Redis do they use?**
Sessions + caches: Upstash HTTPS REST (`upstash.redis.ts`). Queues: TCP
via ioredis (`queue.service.ts`) — BullMQ needs Lua-capable protocol.
Same server, two roads; switch hosts with `REDIS_HOST/PORT/PASSWORD` env
only (non-Upstash hosts use TCP automatically; TLS auto-enables for
`upstash.io` hosts or `NODE_ENV` staging/production).

**Do workers run on the same Render server?**
Yes — single free service, `start.sh` boots `worker-main.js` (background)

- `main.js` (foreground) in one container. Plus `main.ts` self-pings
  `/health` every 14 min to defeat free-tier sleep, so the container (and all
  polling) stays up 24/7. That trio — idle polling × shared container ×
  self-ping — is the complete bill story.

**Key files:** `apps/api/src/config/upstash.redis.ts`,
`apps/api/src/config/session-store.ts`,
`apps/api/src/common/services/queue.service.ts`,
`apps/api/src/common/services/redis-cache.service.ts`,
`apps/api/src/common/utils/ttl-cache.ts`, `apps/api/src/worker-main.ts`,
`apps/api/src/main.ts`, `Dockerfile`, `start.sh`.
