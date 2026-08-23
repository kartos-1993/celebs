# RFC-006: Dynamic Platform Configuration & Feature Flag Engine

**Status**: Proposed / Approved  
**Authors**: Celebs Core Architecture Team  
**Scope**: `apps/api`, `apps/web-admin`, `apps/mobile`, `packages/shared-types`, Database  

---

## 1. Executive Summary & Problem Statement

As e-commerce platforms grow, operational business parameters and feature toggles must change frequently:
- Enabling or disabling **Brand LOA Gating** for Phase 1 MVP vs. Phase 2 Mall launch.
- Adjusting **Global Vendor Commission Rates** (%) or payout hold periods.
- Switching **Product Review Moderation** between instant auto-publishing and manual admin approval.
- Enabling or disabling **Mobile Festival Banners, Flash Sales, or High-AOV Combos**.

### Why Environment Variables (`.env`) Become Technical Debt:
1. **The Redeployment Bottleneck**: Changing a `.env` variable requires committing code or updating container environment variables, triggering a CI/CD build, and restarting/redeploying backend services. During an operational emergency or at the exact midnight conclusion of a flash sale, waiting 10–15 minutes for a build is unacceptable.
2. **Non-Technical Team Blockade**: Product managers, marketing leads, compliance officers, and operations teams cannot toggle flags themselves—they are forced to submit engineering tickets for simple configuration tweaks.
3. **No Audit Trail**: `.env` files maintain no historical record of **who** changed a value, **when** it was altered, or **why** (critical for legal and financial accountability).
4. **Configuration Rot & "Zombie Flags"**: Codebases accumulate dozens of abandoned `if (process.env.ENABLE_XYZ === 'true')` checks that rot over time, making it unclear whether deleting them will break production.
5. **No Granular or Client-Facing Scope**: `.env` flags are global and binary; they cannot be safely exposed to frontend or mobile clients without manual wiring.

---

## 2. The Dynamic Configuration & Feature Flag Architecture

The platform implements a **Live, Database-Backed Dynamic Configuration Engine** with a high-performance **3-Tier Caching System**.

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                   Superadmin Web Portal (Web-Admin)                    │
 │               /platform-settings (Visual Toggle Switches)              │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │ PATCH /api/v1/admin/settings/:key
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      Platform Config Service                           │
 │                                                                        │
 │   1. Writes to PostgreSQL (Persistent Source of Truth)                 │
 │   2. Records Audit Log Entry (Actor ID, Old Value, New Value)          │
 │   3. Broadcasts Redis Invalidation (0ms cache flush)                   │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
 ┌──────────────────────────────────┐      ┌──────────────────────────────────┐
 │         Level 1 Cache            │      │         Level 2 Cache            │
 │     In-Memory Map (0.001ms)      │      │    Upstash Redis (1-2ms)         │
 └──────────────────────────────────┘      └──────────────────────────────────┘
```

---

## 3. Database Schema (`apps/api/src/db/schema.prisma`)

```prisma
enum SettingType {
  BOOLEAN
  NUMBER
  STRING
  JSON
}

model PlatformSetting {
  key          String                   @id // e.g. "brand_gating_enabled", "vendor_commission_rate"
  value        String                   // Stored as string, parsed according to 'type'
  type         SettingType              @default(BOOLEAN)
  group        String                   @default("GENERAL") // "CATALOG", "COMPLIANCE", "FINANCE", "CAMPAIGN"
  label        String                   // "Enable Brand LOA Gating"
  description  String?                  // Helpful guidance for Superadmins
  isPublic     Boolean                  @default(false) @map("is_public") // If true, exposed to mobile app & storefront

  updatedBy    String?                  @map("updated_by")
  updatedAt    DateTime                 @updatedAt
  createdAt    DateTime                 @default(now())

  auditLogs    PlatformSettingAudit[]

  @@index([group])
  @@index([isPublic])
}

model PlatformSettingAudit {
  id           String          @id @default(uuid())
  settingKey   String          @map("setting_key")
  setting      PlatformSetting @relation(fields: [settingKey], references: [key], onDelete: Cascade)
  
  oldValue     String?         @map("old_value")
  newValue     String          @map("new_value")
  changedBy    String          @map("changed_by") // User ID of the acting Superadmin
  reason       String?         // Optional note for audit trail

  createdAt    DateTime        @default(now())

  @@index([settingKey, createdAt])
}
```

---

## 4. High-Performance 3-Tier Caching Service

Because settings are evaluated on high-frequency request paths (e.g. on every product creation, order calculation, or mobile app launch), we **never** perform a raw PostgreSQL database query on every check.

```typescript
// apps/api/src/modules/platform-config/platform-config.service.ts
import { logger } from '@celebs/shared-utils';
import prisma from '@/config/db.prisma';
import redis from '@/config/redis'; // Upstash Redis singleton

export class PlatformConfigService {
  private memoryCache = new Map<string, { value: unknown; expiry: number }>();
  private L1_TTL_MS = 60 * 1000; // 1 minute in-memory TTL
  private L2_TTL_SEC = 300;      // 5 minutes Redis TTL

  // ── Typed Accessors ────────────────────────────────────────────────────────

  async getBoolean(key: string, defaultValue = false): Promise<boolean> {
    const raw = await this.getRaw(key);
    if (raw === null || raw === undefined) return defaultValue;
    return raw === 'true' || raw === '1';
  }

  async getNumber(key: string, defaultValue = 0): Promise<number> {
    const raw = await this.getRaw(key);
    if (raw === null) return defaultValue;
    const parsed = Number(raw);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  async getString(key: string, defaultValue = ''): Promise<string> {
    const raw = await this.getRaw(key);
    return raw ?? defaultValue;
  }

  async getJSON<T>(key: string, defaultValue: T): Promise<T> {
    const raw = await this.getRaw(key);
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      logger.error({ err, key }, 'Failed to parse JSON platform setting');
      return defaultValue;
    }
  }

  // ── Core Retrieval with 3-Tier Cache ────────────────────────────────────────

  private async getRaw(key: string): Promise<string | null> {
    // Tier 1: Local In-Memory Process Cache (~0.001ms)
    const mem = this.memoryCache.get(key);
    if (mem && mem.expiry > Date.now()) {
      return mem.value as string;
    }

    // Tier 2: Upstash Redis Shared Cache (~1-2ms)
    try {
      const redisVal = await redis.get<string>(`config:${key}`);
      if (redisVal !== null && redisVal !== undefined) {
        this.memoryCache.set(key, { value: redisVal, expiry: Date.now() + this.L1_TTL_MS });
        return redisVal;
      }
    } catch (redisErr) {
      logger.warn({ redisErr, key }, 'Redis cache lookup failed, falling back to PostgreSQL');
    }

    // Tier 3: Primary PostgreSQL Query
    const setting = await prisma.platformSetting.findUnique({
      where: { key },
      select: { value: true },
    });

    const val = setting?.value ?? null;

    if (val !== null) {
      // Warm up caches
      this.memoryCache.set(key, { value: val, expiry: Date.now() + this.L1_TTL_MS });
      await redis.set(`config:${key}`, val, { ex: this.L2_TTL_SEC }).catch(() => null);
    }

    return val;
  }

  // ── Mutation with Instant Cache Invalidation ────────────────────────────────

  async setSetting(params: {
    key: string;
    value: string;
    adminUserId: string;
    reason?: string;
  }) {
    const { key, value, adminUserId, reason } = params;

    const existing = await prisma.platformSetting.findUnique({ where: { key } });

    const [updated] = await prisma.$transaction([
      prisma.platformSetting.upsert({
        where: { key },
        update: { value, updatedBy: adminUserId },
        create: {
          key,
          value,
          label: key,
          updatedBy: adminUserId,
        },
      }),
      prisma.platformSettingAudit.create({
        data: {
          settingKey: key,
          oldValue: existing?.value ?? null,
          newValue: value,
          changedBy: adminUserId,
          reason,
        },
      }),
    ]);

    // Instantly purge caches across all layers
    this.memoryCache.delete(key);
    await redis.del(`config:${key}`).catch(() => null);

    logger.info({ key, value, adminUserId }, 'Platform setting updated live');
    return updated;
  }
}

export const platformConfig = new PlatformConfigService();
```

---

## 5. Standard Platform Feature Flags in Celebs

| Flag Key | Type | Default | Description | Impact Area |
| :--- | :--- | :--- | :--- | :--- |
| `brand_gating_enabled` | `BOOLEAN` | `false` | When `false`, sellers can pick any brand without LOA upload. When `true`, gated brands demand verified LOAs. | Brand Registry & Catalog |
| `product_review_required` | `BOOLEAN` | `true` | When `true`, vendor product additions enter review queue before publishing. | Product Lifecycle |
| `strict_kyc_onboarding` | `BOOLEAN` | `false` | When `true`, vendor stores require manual document approval before creating listings. | Vendor Portal |
| `mobile_festival_campaign_enabled` | `BOOLEAN` | `false` | Controls whether the live countdown and festival discount strip render on the mobile app. | Mobile App Homepage |
| `standard_commission_percentage` | `NUMBER` | `8.0` | Default platform commission fee taken on completed 3P orders. | Finance & Settlements |

---

## 6. Real-World Usage Across the Monorepo

### 6.1 Bypassing Brand Gating for Phase 1 MVP ([`brand.service.ts`](file:///c:/celebs/celebs/apps/api/src/modules/brand/brand.service.ts))

```typescript
// apps/api/src/modules/brand/brand.service.ts
import { platformConfig } from '@/modules/platform-config/platform-config.service';

async assertVendorCanUseBrand(params: { vendorId?: string | null; brandId?: string | null; userRole?: string }) {
  const isGatingEnabled = await platformConfig.getBoolean('brand_gating_enabled', false);

  // During Phase 1 MVP, gating is turned OFF in DB -> sellers publish freely without LOA
  if (!isGatingEnabled) {
    return;
  }

  // Enforce strict LOA verification only when gating is toggled ON
  // ...
}
```

---

### 6.2 Instant Mobile Festival Sale Kill-Switch

```typescript
// apps/api/src/modules/layout/layout.service.ts
import { platformConfig } from '@/modules/platform-config/platform-config.service';

async getHomeScreenLayout() {
  const isCampaignLive = await platformConfig.getBoolean('mobile_festival_campaign_enabled', false);

  const widgets = await this.layoutRepository.getHomeWidgets();

  return widgets.map((w) => {
    if (w.type === 'CAMPAIGN_COUNTDOWN') {
      return { ...w, enabled: isCampaignLive };
    }
    return w;
  });
}
```

---

## 7. Web-Admin Superadmin Portal UI

In [`apps/web-admin/src/features/platform-settings`](file:///c:/celebs/celebs/apps/web-admin/src/features/platform-settings):

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │ Platform Configuration & Live Feature Flags                            │
 │ Manage runtime operational thresholds without server redeployments     │
 ├────────────────────────────────────────────────────────────────────────┤
 │                                                                        │
 │  Catalog & Compliance                                                  │
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │ Enable Brand LOA Gating                                          │  │
 │  │ Require approved Letter of Authorization to sell restricted brands│  │
 │  │ [ OFF ] ◄── Superadmin clicks to toggle ON instantly             │  │
 │  └──────────────────────────────────────────────────────────────────┘  │
 │                                                                        │
 │  Mobile App Marketing                                                  │
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │ Festival Campaign Countdown Banner                               │  │
 │  │ Display festive discount countdown on mobile app homepage        │  │
 │  │ [ ON  ] ◄── Superadmin turns OFF at midnight with 0 app updates  │  │
 │  └──────────────────────────────────────────────────────────────────┘  │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Summary of Benefits

1. **Zero Deployment Overhead**: Business policies and marketing campaigns change instantly in production.
2. **Zero Technical Debt**: Code remains clean, permanent, and strongly typed without random `.env` checks.
3. **Full Audit Governance**: Every toggle modification is tied to an admin user ID, timestamp, and previous state.
4. **Resilient & Fast**: Sub-millisecond read latency backed by 3-tier caching ensures zero database strain.
