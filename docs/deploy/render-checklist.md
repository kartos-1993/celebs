# Render Deployment Checklist — Post-Hardening Stack

Applies to deploying the branch stack ending at
`chore/api-r2-orphan-reaper` (HEAD `2628635`+). Read together with
`docs/reports/2026-08-24-platform-hardening-report.md`.

---

## 1. REQUIRED: run a queue worker service

The API now enqueues transactional emails to BullMQ (`mail-delivery`),
joining the pre-existing `asset-processing` and `session-maintenance`
queues. **Queues are only processed by the worker entrypoint**
(`apps/api/src/worker-main.ts` → `start:worker` script).

The exported `render.yaml` defines **only the web service** (`celebs`,
Docker runtime, branch `staging`). Without a worker service:

- ❌ No vendor approval/rejection/verification emails are sent
- ❌ Asset processing and session purge jobs never run
- ✅ The API itself still works — registration/login fall back to inline
  email send when the enqueue fails, but only if Redis is _down_. If Redis
  is up and no worker runs, emails silently pile up in the queue.

### Fix options

**Option A (preferred): Render Background Worker (native runtime)**

Create a new service of type `worker`:

| Setting                    | Value                                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime                    | Node                                                                                                                                           |
| Build command              | `corepack enable && pnpm install --frozen-lockfile && pnpm prisma:generate && pnpm --filter "@celebs/*" build && pnpm --filter api build`      |
| Pre-deploy / start command | `node apps/api/dist/apps/api/src/worker-main.js` _(verify emitted path against your Dockerfile's build output; adjust if dist layout differs)_ |
| Env vars                   | Copy ALL env vars from the web service (`REDIS_*`, `DATABASE_URL`, `DIRECT_URL`, `S3_*`, `APP_ORIGIN`, `SMTP_API_KEY`, JWT secrets, …)         |

> Note: Render Background Workers historically require the native runtime
> (Docker runtime is web-service-only). If your build pipeline depends on
> the Dockerfile, Option B avoids repackaging.

**Option B: second Docker web service as a worker**

Duplicate the existing web service, name it `celebs-worker`, keep Docker
runtime + same Dockerfile, and override the service start command so the
container process is `node <dist>/worker-main.js` instead of `main.js`.
Expose no port. Add a health-check path only if you keep it as a web
service (otherwise leave blank). This is functionally a worker; it just
bills as a web service.

Either way, verify after first deploy:

```
Logs contain: "BullMQ Worker is active and listening to queues:
asset-processing, mail-delivery, session-maintenance"
```

---

## 2. Verify environment variables on the web service

| Var                                            | Required change?                 | Notes                                                                                                                                                                                                                             |
| ---------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_ORIGIN`                                   | **Verify value per environment** | Vendor/product emails now build links from it (`buildWebUrl`). Wrong/missing value → links point to `http://localhost:5173`. Must be the storefront/admin origin for that environment (e.g. `https://celebs-admin.onrender.com`). |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Already present ✅               | Now also used by new storefront caches (`TtlCache`) and mail queue. Same Upstash instance is fine.                                                                                                                                |
| `SMTP_API_KEY`                                 | Optional                         | Brevo HTTP transport when set; SMTP otherwise. Queued either way.                                                                                                                                                                 |
| `S3_*`, `AWS_*`                                | Already present ✅               | Unchanged; reaper uses them too.                                                                                                                                                                                                  |
| `DATABASE_URL` / `DIRECT_URL`                  | Already present ✅               | Schema already synced earlier this cycle (`PlatformSetting` tables).                                                                                                                                                              |
| New env vars introduced by code changes        | **None**                         | Caching/queues reuse `REDIS_*`; nothing else was added.                                                                                                                                                                           |

---

## 3. CI / toolchain notes

- Nx and webpack remnants were removed from the root `package.json`.
  `.github/workflows/ci.yml` uses plain `pnpm typecheck | lint | test | build`
  — verified unaffected.
- Local machines that still have `nxConsole` settings or global nx installs
  can ignore them; nothing references nx anymore.
- Prisma client must be generated before typecheck/build locally
  (`pnpm prisma:generate`) — a fresh clone without it shows phantom errors.

---

## 4. Post-deploy smoke tests (staging)

1. **Queues alive** → worker logs show all three queues listening (see §1).
2. **Async email** → trigger vendor approval or user registration; email
   arrives within seconds; API response returned immediately.
3. **Campaign edit integrity** → edit an existing campaign's product list,
   save, reopen: products match (this flow was silently broken before).
4. **Validation hardening** → PUT `/campaigns/:id` with an unknown field
   returns 400 (previously accepted silently).
5. **Storefront cache lag** → update banners in admin; mobile/web reflects
   within ~60s worst case without restart.
6. **Category pagination** → request `page=2`; results differ from page 1.
7. **Error logging** → force a 500; Render logs show JSON pino entries with
   `path`/`method` (not raw console text).
8. **Product audit trail** → SuperAdmin edits any product field; review
   history shows an `Edited · Platform` entry listing changed fields.

---

## 5. R2 orphan cleanup (operational, optional)

Dry-run (read-only) against staging bucket:

```bash
cd apps/api
npm run r2:orphans            # report only
npm run r2:orphans -- --delete --older-than-days=30   # actual cleanup
```

Current staging scan: 51 orphan objects ≈ 9.66 MB (after live-reference
cross-check). Deletion is safe only after reviewing the printed key list;
the tool excludes anything referenced by products/banners/vendors/campaigns/
combos/brands/authorizations and objects newer than the cutoff.

Recommended cadence: monthly dry-run; delete quarterly after review.

---

## 6. Rollback notes

All changes are backward-compatible with the previous schema (no new
migrations since `PlatformSetting`). Rollback = redeploy previous image;
in-flight queued mail jobs in Redis will simply be processed by whichever
version runs next. The only forward-only artifact is cached data
(TTL ≤ 5 min) which self-expires.
