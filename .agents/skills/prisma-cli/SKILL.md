---
name: prisma-cli
description: 'Standard operational procedures for Prisma CLI migrations, client generation, DDL execution on direct port 5432, and schema validation.'
---

# Prisma CLI Runbook & Migration Protocol

Use this skill whenever generating, running, or troubleshooting database migrations and Prisma schema changes.

---

## 1. Connection Protocol for Migrations (Critical)

Prisma migrations execute DDL (`CREATE TABLE`, `CREATE INDEX`, `ALTER TABLE`) and require PostgreSQL advisory locks:

- **Never run migrations through the port 6543 connection pooler.** Transaction-mode poolers reject migration advisory locks and throw `ERROR: prepared statement already exists` or lock failures.
- **Always run migrations against `DIRECT_URL` (Port 5432).** Direct session mode natively supports DDL locking and schema synchronization.

Our root [`prisma.config.ts`](file:///c:/celebs/celebs/prisma.config.ts) handles this automatically:

```typescript
datasource: {
  url: process.env.DIRECT_URL || process.env.DIRECT_URI || process.env.DATABASE_URL;
}
```

---

## 2. Standard Migration Workflow

### Step 1: Modify Schema

Update models, relations, or indexes in [`apps/api/src/db/schema.prisma`](file:///c:/celebs/celebs/apps/api/src/db/schema.prisma).

### Step 2: Validate Schema

Run schema syntax and constraint validation before creating a migration:

```bash
npx prisma validate
```

### Step 3: Create & Apply Migration (Development)

Generate a clean SQL migration file and apply it to the database:

```bash
npx prisma migrate dev --name <descriptive_snake_case_name>
```

_Example:_ `npx prisma migrate dev --name add_order_and_inventory_fk_indexes`

### Step 4: Regenerate Prisma Client

Ensure TypeScript types and client queries are synced with the new schema:

```bash
npx prisma generate
```

---

## 3. Production & Staging Deployment Protocol

In CI/CD and deployment environments (e.g. Render / Docker):

- **Never run `prisma migrate dev` in production.** It creates shadow databases and requires interactive confirmation.
- **Always use `prisma migrate deploy`:**
  ```bash
  npx prisma migrate deploy
  ```
  Applies all pending migrations atomically against the target database without altering migration history.

---

## 4. Disaster Recovery & Troubleshooting

| Issue                                     | Cause                                                      | Solution                                                                                     |
| :---------------------------------------- | :--------------------------------------------------------- | :------------------------------------------------------------------------------------------- |
| `P3005: The database schema is not empty` | Initializing `migrate dev` on existing non-empty database  | Run `npx prisma migrate resolve --applied <migration_name>` or baseline existing schema.     |
| Advisory lock timeout                     | Concurrent migration runner holding lock or port 6543 used | Ensure `DIRECT_URL` on port 5432 is active; terminate stale backends via `pg_stat_activity`. |
| Drift detected                            | Schema manually altered outside Prisma migrations          | Inspect drift with `npx prisma migrate diff` before resolving.                               |
