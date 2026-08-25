# RFC-002: Brand Registry, 1P vs 3P Branding & Brand Protection System

**Status**: Proposed  
**Authors**: Celebs Core Engineering Team  
**Scope**: `apps/api`, `apps/web-admin`, `apps/mobile`, `packages/shared-types`, Database

---

## 1. Executive Summary & Problem Statement

Currently, the `Product` entity in `celebs` stores `brand` as a nullable unverified string (`brand: String?`). This presents significant business and legal risks:

1. **Brand Hijacking & Counterfeiting**: Any vendor can list generic items under protected trademarks (e.g. typing `"Nike"`, `"Zara"`, `"Levi's"` or `"Celebs Exclusive"`).
2. **Ambiguous 1P vs. 3P Identity**: The platform lacks a formal mechanism to distinguish Celebs private label merchandise (1P) from authorized vendor flagship stores (Mall) and generic marketplace sellers (3P).
3. **Absence of Brand Protection (LOA)**: Legitimate brand owners and exclusive distributors have no way to register their trademarks or prevent unauthorized sellers from listing against their brand name.

This RFC outlines the architecture for a **Daraz Mall / Shein / Amazon Brand Registry-grade Brand Management and Anti-Counterfeiting Protection System**.

---

## 2. 1P vs. 3P Brand Hierarchy

The platform establishes four distinct brand tiers:

| Tier                                | Category            | Example                                              | Eligibility & Authorization                                       | Customer Trust Badge         |
| :---------------------------------- | :------------------ | :--------------------------------------------------- | :---------------------------------------------------------------- | :--------------------------- |
| **Tier 1: 1P Private Label**        | `FIRST_PARTY`       | _Celebs Studio_, _Celebs Denim_, _MOTF-style labels_ | Restricted strictly to Celebs Platform Super-Admins               | **✨ Celebs Official**       |
| **Tier 2: Gated Global / Premium**  | `GATED_GLOBAL`      | _Nike_, _Zara_, _Apple_, _Levi's_                    | Requires approved Letter of Authorization (LOA) or Trademark Cert | **🛡️ Verified Brand Store**  |
| **Tier 3: Registered Vendor Brand** | `REGISTERED_VENDOR` | _Local Designer Label_, _Exclusive Vendor Brand_     | Registered by vendor with proof of trademark ownership            | **🏬 Brand Authorized**      |
| **Tier 4: Open / Generic**          | `OPEN_GENERIC`      | _Generic_, _Unbranded_, _OEM Fashion_                | Open to all registered vendors                                    | _Standard Seller Storefront_ |

---

## 3. Database Schema (Prisma)

```prisma
// ==========================================
// BRAND REGISTRY & PROTECTION ENGINE
// ==========================================

enum BrandTier {
  FIRST_PARTY       // Celebs private label
  GATED_GLOBAL      // Protected global/national trademarks
  REGISTERED_VENDOR // Vendor trademarked brand
  OPEN_GENERIC      // Open to all sellers
}

enum BrandAuthStatus {
  PENDING
  UNDER_REVIEW
  APPROVED
  REJECTED
  EXPIRED
  REVOKED
}

enum InfringementStatus {
  SUBMITTED
  INVESTIGATING
  LISTING_TAKEN_DOWN
  REJECTED
  RESOLVED
}

model Brand {
  id               String          @id @default(uuid())
  name             String          @unique
  slug             String          @unique
  logoUrl          String?         @map("logo_url")
  bannerUrl        String?         @map("banner_url")
  description      String?
  websiteUrl       String?         @map("website_url")

  tier             BrandTier       @default(OPEN_GENERIC)
  isGated          Boolean         @default(false) @map("is_gated")

  // Brand Owner Information (if vendor-owned)
  ownerVendorId    String?         @map("owner_vendor_id")
  ownerVendor      VendorProfile?  @relation("OwnedBrands", fields: [ownerVendorId], references: [id], onDelete: SetNull)

  // Relations
  products         Product[]
  authorizations   VendorBrandAuthorization[]
  protectionRules  BrandProtectionRule[]
  infringements    BrandInfringementReport[]

  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  @@index([tier, isGated])
  @@index([ownerVendorId])
}

model VendorBrandAuthorization {
  id                 String          @id @default(uuid())
  vendorId           String          @map("vendor_id")
  vendor             VendorProfile   @relation(fields: [vendorId], references: [id], onDelete: Cascade)

  brandId            String          @map("brand_id")
  brand              Brand           @relation(fields: [brandId], references: [id], onDelete: Cascade)

  status             BrandAuthStatus @default(PENDING)
  documentType       String          @map("document_type") // LOA, TRADEMARK_CERT, INVOICE
  documentUrl        String          @map("document_url")  // Cloudflare R2 KYC Private Vault
  documentExpiryDate DateTime?       @map("document_expiry_date")

  // Moderation Audit Trail
  reviewedBy         String?         @map("reviewed_by")
  reviewedAt         DateTime?       @map("reviewed_at")
  reviewNotes        String?         @map("review_notes")
  rejectionReason    String?         @map("rejection_reason")

  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  @@unique([vendorId, brandId])
  @@index([vendorId, status])
  @@index([brandId, status])
}

model BrandProtectionRule {
  id          String   @id @default(uuid())
  brandId     String   @map("brand_id")
  brand       Brand    @relation(fields: [brandId], references: [id], onDelete: Cascade)

  // Forbidden keywords or regex patterns for unauthorized sellers
  pattern     String   // e.g. "(?i)\\b(nike|air\\s*jordan)\\b"
  matchField  String   @default("TITLE_AND_DESCRIPTION") @map("match_field")
  isActive    Boolean  @default(true) @map("is_active")

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([brandId, isActive])
}

model BrandInfringementReport {
  id              String             @id @default(uuid())
  brandId         String             @map("brand_id")
  brand           Brand              @relation(fields: [brandId], references: [id], onDelete: Cascade)

  reporterVendorId String?           @map("reporter_vendor_id")
  reporterVendor   VendorProfile?    @relation("ReportedInfringements", fields: [reporterVendorId], references: [id], onDelete: SetNull)

  accusedProductId String            @map("accused_product_id")
  accusedProduct   Product           @relation(fields: [accusedProductId], references: [id], onDelete: Cascade)

  reason          String             // COUNTERFEIT, TRADEMARK_INFRINGEMENT, COPYRIGHT_IMAGE_THEFT
  evidenceUrl     String?            @map("evidence_url")
  description     String
  status          InfringementStatus @default(SUBMITTED)
  adminNotes      String?            @map("admin_notes")
  actionTakenAt   DateTime?          @map("action_taken_at")

  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  @@index([brandId, status])
  @@index([accusedProductId])
}
```

---

## 4. Brand Protection & Product Listing Gate Enforcement

When a vendor saves or publishes a product (`POST /api/v1/products` or `PUT /api/v1/products/:id`):

```
                        Product Save / Publish Request
                                      │
                                      ▼
                      1. Brand ID Relational Validation
                                      │
                         Is Brand `FIRST_PARTY`?
                                    /   \
                                  YES    NO
                                  /        \
       Caller is NOT Super-Admin /          Is Brand Gated (`GATED_GLOBAL` or `isGated = true`)?
       🛑 403 Forbidden                      /   \
                                           YES    NO (Generic / Open)
                                           /        \
   Has Vendor an APPROVED Authorization?  /          └──> Pass Brand ID Check
                                        /   \
                                      YES    NO
                                      /        \
                                     /          └──> 🛑 403 Forbidden: "Brand Authorization Required"
                                    ▼
                      2. Automated Anti-Hijack Screening
         (Check title/description against active BrandProtectionRules)
                                    │
               Unauthorized keyword detected for a protected brand?
                                  /   \
                                YES    NO
                                /        \
           🛑 422 Unprocessable           └──> ✅ Product Published
```

---

## 5. Vendor Brand Authorization Workflow (LOA Portal)

1. **Application Submission (`apps/web-admin`)**:
   - Vendor navigates to **Seller Center > Brand Authorizations > Apply for Brand**.
   - Selects the target Brand from the verified brand catalog.
   - Uploads supporting documentation (e.g. Letter of Authorization from Official Brand, Trademark Certificate, or Authorized Purchase Invoices).
2. **Admin Review Queue**:
   - Platform operations team reviews document authenticity, expiry dates, and authorized product categories.
   - Status updates to `APPROVED` or `REJECTED` with specific feedback reasons.
3. **Lifecycle & Expiry Alerts**:
   - Automated BullMQ cron triggers 30-day and 7-day expiry warnings before an LOA expires.
   - If an LOA expires without renewal, associated products are automatically transitioned to `draft` status with notice.

---

## 6. Storefront & Customer Experience

### In Web & Mobile PDP:

1. **1P Platform Products**:
   - Badge: `✨ Celebs Official`
   - Benefits: _Fast Track 24h Dispatch | Free 14-day Returns | Guaranteed Authentic_
2. **Verified Brand Mall Products**:
   - Badge: `🛡️ Verified Brand Store` (e.g., _"Official Levi's Store"_)
   - Direct link to brand's curated showcase tab.
3. **General Marketplace Products**:
   - Label: _"Sold by [Vendor Shop Name]"_ + Vendor Rating Score.

---

## 7. IP Infringement & Takedown Engine (DMCA / Notice & Action)

- Brand owners and verified distributors can submit infringement notices directly via the Brand Portal.
- Upon submission, the accused listing enters a temporary freeze (`status = 'under_investigation'`).
- The accused seller has 72 hours to provide counter-evidence (e.g., proof of authentic sourcing).
- If rejected or unanswered, the listing is permanently taken down and the vendor receives a compliance strike.
