# Observability & Production Debugging Guide

> How to find out **what happened, where it went wrong, and why** — across the API,
> background worker, and every managed service this stack depends on.
>
> Stack context: Render (Docker: API + worker in one container) · Supabase Postgres ·
> Upstash Redis (BullMQ) · Cloudflare R2 · Brevo email · pino logging.

---

## 0. The mental model — how it all fits together

```
┌─────────────────────────── Your container (Render) ───────────────────────────┐
│                                                                               │
│   node dist/src/main.js   ──┐                                                 │
│                             ├── pino JSON logs ──► stdout/stderr              │
│   node dist/src/worker-main.js ─┘                     │                       │
│                                                       ▼                       │
└───────────────────────────────────────────────────────│───────────────────────┘
                                                        │ captured by platform
                        ┌───────────────────────────────┼─────────────┐
                        ▼                               ▼             ▼
                 Render Logs tab                 Render Metrics    Log Drain ──►
                 (search, ~7d retention)         (CPU/RAM/latency)  (Axiom /
                                                                 Better Stack…)
                                                        │
                                                        ▼
                                              Render Webhooks ──► Discord/Slack
                                              (deploy failed, crashed)

   Errors thrown ──► errorHandler middleware ──► logger.error()
                                             └─► (optional) Sentry ◄── best
                                                     stack traces, grouping,
                                                     email/Slack alerts

   Is it up? ──► GET /health (checks Postgres + Redis) ◄── polled by
                Render health checks + UptimeRobot
```

Three layers, each answers a different question:

| Layer                   | Question it answers                                              | Tool                                      |
| ----------------------- | ---------------------------------------------------------------- | ----------------------------------------- |
| **Logging**             | "What exactly happened inside my code?"                          | pino → Render logs → (drain)              |
| **Error tracking**      | "Which errors happen, how often, which release introduced them?" | Sentry (recommended)                      |
| **Monitoring/alerting** | "Is the service up right now? Did a deploy break it?"            | Render events + uptime monitor + webhooks |

---

## 1. Logging — how it works today

### Where logs come from

Everything the app prints to **stdout/stderr is captured by Render automatically**.
Both processes write there (`main.js` and `worker-main.js` share one stream — their
log lines interleave; that is expected).

The logger lives in `packages/shared-utils/src/utils/logger.ts`:

- **Development**: pretty colorized output (pino-pretty).
- **Staging/production**: raw **JSON lines**, one object per event. This is deliberate —
  JSON is machine-searchable and survives forwarding to log platforms intact.

### Reading a production log line

```json
{
  "level": 50,
  "time": 1756102345678,
  "path": "/api/v1/orders",
  "method": "POST",
  "name": "PrismaClientKnownRequestError",
  "message": "Invalid `prisma.order.create()`",
  "errorCode": "INTERNAL_SERVER_ERROR",
  "stack": "Error: ...\n    at ...",
  "msg": "Unhandled error on PATH: /api/v1/orders"
}
```

| Field                        | Meaning                                                                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `level`                      | 10=trace 20=debug 30=info **40=warn 50=error** 60=fatal                                                                 |
| `time`                       | Unix ms timestamp                                                                                                       |
| `path` / `method`            | HTTP route that produced the event                                                                                      |
| `name` / `message` / `stack` | Exception details (stack only on unexpected errors — see `errorHandler` in `apps/api/src/middlewares/error-handler.ts`) |
| `errorCode`                  | Your app-level error codes (`@celebs/shared-utils`)                                                                     |
| `msg`                        | Human-readable summary                                                                                                  |

Worker lines carry no `path/method`; they identify themselves by message
(e.g. `"BullMQ Worker is active..."`, job names like `purge-expired-sessions`).

### Searching effectively (Render Logs tab)

Filter by severity first, then narrow:

```
level:50                    ← all errors
"Unhandled error"           ← unexpected exceptions (the ones you care about)
"P2002" / "P2025"           ← known Prisma failures
"BullMQ"                    ← worker/queue activity
level:40                    ← handled AppErrors (business rejections)
```

### ⚠️ Set LOG_LEVEL in Render

`logger.ts` defaults to `debug`, which is noisy in production. Add an env var in the
Render dashboard (or `render.yaml`):

```
LOG_LEVEL = info        # keeps warn(40)+error(50)+startup info(30), drops debug spam
```

### Retention warning

Render keeps logs **for about a week** (check your dashboard for the current limit)
and the built-in search is basic. That's fine for "deploy broke, look now", useless
for "customer says order #4821 failed last Tuesday". Fix: a **log drain** (§3) or
**Sentry** (§4).

---

## 2. Render's built-in tools (free, use these first)

| Tab                        | What it gives you                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Events**                 | Deploy history, crash/restart detection, suspend events. First stop for "did a deploy cause this?"                                           |
| **Logs**                   | Live-tail + search of everything above (limited retention)                                                                                   |
| **Metrics** _(paid plans)_ | CPU, Memory, HTTP request rate, **p95 latency**, bandwidth. Watch memory here — sharp image processing is the usual suspect for OOM restarts |
| **Shell** _(paid plans)_   | `bin/sh` into the running container to poke around live                                                                                      |
| **Deploys → Rollback**     | One-click revert to previous image. Fastest fix when a deploy breaks prod                                                                    |

### Configure two things you don't have yet

**a) Health check path** — tells Render to verify the app actually serves traffic
(and auto-restart on repeated failures). In `render.yaml` under the web service:

```yaml
healthCheckPath: /health
```

Your endpoint already checks Postgres + Redis + returns memory stats
(`apps/api/src/modules/health/health.routes.ts`). Note: Redis DOWN alone returns
HTTP 200 (`DEGRADED`), Postgres DOWN returns 503 — so a dead Redis won't flap the
service, which is reasonable.

**b) Notifications** — Dashboard → your team → **Notifications**: wire _Deploy failed_,
_Service crashed_, _Autodeploy disabled_ to email/Slack/Discord webhook. This is how
you learn about failures without watching the dashboard.

---

## 3. Keeping logs forever — Log Drains

A log drain forwards every stdout line to an external platform with real search,
long retention, and dashboards. Setup: Render dashboard → **Log Drains** → paste an
ingest URL from the provider. (May require a paid instance.)

Budget options, all adequate at your scale:

| Provider                   | Free tier            | Notes                                                       |
| -------------------------- | -------------------- | ----------------------------------------------------------- |
| **Axiom** (axiom.co)       | generous (~500GB/mo) | Best free value; SQL-like queries over JSON fields          |
| **Better Stack / Logtail** | ~1GB/mo              | Very polished UI, also sells uptime monitoring in one place |
| **Grafana Cloud (Loki)**   | ~50GB/mo             | Powerful, steeper learning curve                            |

Since your logs are already JSON with stable field names, queries like
`level >= 50 | group by path` or "all logs where `errorCode == AUTH_EMAIL_ALREADY_EXISTS`
in last 24h" work out of the box.

**Recommendation:** skip drains initially; go straight to Sentry (next section) —
it covers 80% of real debugging needs. Add a drain when you need business analytics
from logs or >week retention.

---

## 4. Error tracking — Sentry (highest value addition)

Render logs tell you an error happened once. **Sentry tells you:**

- Every distinct error, deduplicated/grouped, with full stack traces
- Which release first introduced each error (release tracking)
- How many users/requests were affected
- Email/Discord alerts the moment a new error type appears
- Breadcrumbs: the last N log lines/db queries before the crash

Free tier: 5k errors/month — far more than you need now.

### Integration (when ready to implement)

```bash
pnpm --filter api add @sentry/node
```

In `apps/api/src/main.ts` (before anything else):

```ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN, // set in Render env vars
  environment: process.env.NODE_ENV, // 'staging' | 'production'
  release: process.env.RENDER_GIT_COMMIT, // Render injects this — enables release tracking
  tracesSampleRate: 0.1, // 10% performance tracing (see §5)
});
```

In `error-handler.ts`, add one line at the top of `errorHandler`:

```ts
if (!(error instanceof AppError)) {
  Sentry.captureException(error, { extra: { path: req.path, method: req.method } });
}
```

Only unexpected errors get sent (handled `AppError`s are business logic, not bugs —
they'd burn your quota with noise).

Do the same `Sentry.init` in `worker-main.ts` plus:

```ts
process.on('unhandledRejection', (err) => Sentry.captureException(err));
process.on('uncaughtException', (err) => {
  Sentry.captureException(err); /* let Render restart */
});
```

---

## 5. Tracing / APM — do you need it?

Full APM (Datadog/New Relic, $$$) is overkill now. But two cheap pieces give you
most of the value:

**a) Distributed spans via Sentry (already enabled above)** — with `tracesSampleRate`,
Sentry shows slow endpoints and which DB call / external API made them slow
("POST /orders took 4s — 3.8s in Stripe adapter"). Zero infra.

**b) Request correlation IDs — the missing glue.** When a mobile user reports
"checkout failed", you need one ID linking: client report → log line → Sentry issue.
Recommended middleware (add later):

```ts
// apps/api/src/middlewares/request-context.ts
import { randomUUID } from 'crypto';
import { RequestHandler } from 'express';

export const requestContext: RequestHandler = (req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  res.setHeader('X-Request-Id', requestId);
  (req as any).requestId = requestId;
  next();
};
```

Then log it: `logger.child({ requestId: req.requestId })` in routes, and pass it in
API error responses (`{ success:false, requestId }`) so support tickets contain it.
Search `requestId:<value>` in any log tool → complete story of that request,
including queue jobs it spawned.

---

## 6. Uptime monitoring & alert routing

| Layer                                     | Tool                                                 | Config                                                                              |
| ----------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Platform knows app is dead                | Render health checks                                 | `healthCheckPath: /health` (§2)                                                     |
| **You** know app is down (within minutes) | **UptimeRobot** (free, 50 monitors) or Better Uptime | Monitor: HTTPS → `https://<your-host>/health`, every 5 min, alert via email/Discord |
| Deploy/crash notifications                | Render Notifications/Webhooks                        | Events → Discord webhook                                                            |

Why an external monitor even though Render checks health: Render's checks control
restart behavior; an external monitor controls **your awareness** — independent of
the platform failing itself, and it watches TLS cert expiry and DNS too.

Add a second UptimeRobot monitor hitting `${BASE_PATH}/health` if you want the
Redis-degraded case visible (it 200s with `services.redis: "DOWN"` — parse body or
just rely on §7 signals).

---

## 7. Background jobs & queues (BullMQ + Upstash)

Your queues: `asset-processing`, `mail-delivery`, `session-maintenance`,
`order-maintenance`. Since worker + API share one container/log stream, worker
crashes surface in the same Render log — search `BullMQ` or `Failed`.

Debug toolkit, cheapest first:

1. **Upstash console** — your data browser + command statistics. If command volume
   suddenly explodes, a repeatable job is probably looping/failing-and-retrying.
2. **Log signatures**:
   - `Failed` + attempts/backoff messages → a job keeps throwing (mail creds bad,
     S3 key missing…). `removeOnFail:false` means failures stay inspectable.
   - Missing expected repeatable runs (`purge-expired-sessions` daily,
     `release-stale-reservations` every 30min) → worker process died; check Render
     Events for restarts.
3. **Bull Board UI** (add later if queues grow): mount `@bull-board/express` behind
   admin auth for a visual dashboard of pending/failed/completed jobs with error
   payloads. ~30 lines of code; skip until needed.
4. **Email deliverability specifically** → Brevo dashboard (Transactional → Logs):
   shows delivered/bounced/blocked/spam per message. If Brevo API calls fail, the
   mail worker logs `Brevo API call failed` (mailer.ts) and falls back — search that.

---

## 8. Managed-service dashboards (where non-app problems live)

| Service           | Check when…                                                              | Where                                                                   |
| ----------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| **Supabase**      | slow queries, connection exhaustion, disk near limit, migrations drifted | Dashboard → Database (Query performance, Backups), Logs (Postgres logs) |
| **Upstash**       | queue weirdness, latency, command quota                                  | Console → your DB → Stats / Data Browser                                |
| **Cloudflare R2** | upload failures, egress spikes                                           | Dashboard → R2 → Metrics; S3 errors appear in API logs (`s3.client.ts`) |
| **Brevo**         | emails not arriving                                                      | Dashboard → Transactional → Logs (per-message status)                   |
| **Google OAuth**  | login failures with `redirect_uri_mismatch`                              | GCP Console → Credentials → authorized origins                          |

Rule of thumb: **API logs first** (they usually contain the upstream error verbatim),
then the vendor dashboard for account/quota/domain issues that never reach your code
as exceptions (e.g. Supabase pausing a free project on inactivity — a classic).

---

## 9. Incident runbook — "something broke"

Work top-down; stop when found:

1. **Is it down?** Open the site/health URL. Then Render **Events**: recent deploy?
   crash loop? Suspended (out of credits)?
2. **Deploy-related?** Events show the deploy commit. If yes and urgent →
   **Deploys → previous → Rollback** (minutes). Debug properly afterwards.
3. **What is the app saying?** Logs tab → filter `level>=50`, read newest.
   Match against the signature table below.
4. **Dependencies healthy?** `GET /health` → `postgres`/`redis` fields. Vendor
   dashboards per §8.
5. **Queues stuck?** §7 signatures; check Upstash stats.
6. **Still nothing in logs** → likely infra-layer (build failure, port binding,
   crash before logger init): scroll to the **bottom** of the deploy log — the last
   exception before `Exited with status N` is the cause (that's exactly how the two
   `Cannot find module` failures surfaced).

### Common failure signatures (this repo's real history)

| Log/deploy signature                                                         | Meaning                                                             | Fix pattern                                                                                |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `Cannot find module '...'` right after startup                               | Build/runtime dependency mismatch (e.g. linker config not in image) | Compare Dockerfile COPY list vs local `.npmrc`; ensure deps land in copied `node_modules`  |
| `Relative import paths need explicit file extensions` / relative module miss | Compiled output referencing paths outside `/app/dist`               | Don't alias workspace packages to `src/` in the build tsconfig (see tsconfig.app.json fix) |
| `P1001: Can't reach database server` at boot                                 | Supabase paused (free tier inactivity) or wrong `DATABASE_URL`      | Wake/restore project in Supabase dashboard                                                 |
| `Redis Connection verification failed`                                       | Wrong Upstash host/password/port or TLS mismatch                    | Env vars; TLS is auto-enabled for staging/prod (`queue.service.ts`)                        |
| Repeated `Brevo API call failed`                                             | Invalid/expired `SMTP_API_KEY`, unverified sender                   | Brevo dashboard; verify domain SPF/DKIM                                                    |
| Memory metric climbing then restarts                                         | sharp/large payload leak                                            | Check Media module usage; consider raising plan RAM                                        |
| `No pending migrations` but runtime column errors                            | Schema drifted outside migrations                                   | Regenerate a migration; never edit schema without `migrate dev`                            |

### Local reproduction against staging data (careful!)

Copy staging secrets into `apps/api/.env.development` **only temporarily**, and
prefer read-only operations. Never point local seeds/tests at staging DB
(`db:push --accept-data-loss` in the test script will wipe it).

---

## 10. Recommended rollout by stage

### Stage 1 — now ($0/mo)

- [x] Structured JSON logging (done — pino)
- [ ] `LOG_LEVEL=info` in Render env vars
- [ ] `healthCheckPath: /health` in render.yaml
- [ ] Render Notifications → your email/Discord
- [ ] External uptime monitor on `/health` (UptimeRobot, free)
- [ ] Sentry (error tracking + alerts) — biggest win, still free

### Stage 2 — ads are running (~$9/mo)

- [ ] Sentry release tracking wired to `RENDER_GIT_COMMIT`
- [ ] Request-ID middleware + surfaced in error responses (§5b)
- [ ] Log drain to Axiom/Better Stack (needs paid Render instance anyway for stability)
- [ ] Render Starter plan (kills cold starts — mandatory once real users hit ads)
- [ ] Brevo domain authentication (SPF/DKIM/DMARC for celebs.com.np)

### Stage 3 — scale (later)

- [ ] Split worker into its own Render Background Worker (independent scaling/logs)
- [ ] Bull Board behind admin auth
- [ ] Sentry Performance sampling tuned; consider Grafana dashboards over drained logs
- [ ] Supabase Pro (backups/PITR) before real money flows through orders

---

## 11. Quick reference — URLs to bookmark

| What                          | Where                                           |
| ----------------------------- | ----------------------------------------------- |
| Live logs / deploys / metrics | Render dashboard → service `celebs`             |
| Health endpoint               | `https://<host>/health` (also `/api/v1/health`) |
| Errors + alerts               | sentry.io → celebs project                      |
| Queue data / redis stats      | upstash.com console                             |
| DB perf, backups, logs        | supabase.com dashboard                          |
| Email delivery proof          | Brevo → Transactional → Logs                    |
| Upload/storage metrics        | Cloudflare → R2 → Metrics                       |
