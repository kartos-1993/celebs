# RFC-001: Multi-Vendor Media Management & Storage Architecture

**Status**: Proposed  
**Authors**: Celebs Core Engineering Team  
**Scope**: `apps/api`, `apps/web-admin`, `apps/mobile`, `packages/shared-types`, Database

---

## 1. Executive Summary & Problem Statement

Currently, the platform uploads media directly to a global S3/Cloudflare R2 prefix (`celebs/products/`, `celebs/kyc/`) using single-shot presigned URLs. This creates critical operational limitations:

1. **No Tenant Isolation**: All vendor uploads are mixed in flat object prefixes without tenant boundaries.
2. **No Media Library (DAM)**: Vendors cannot browse, reuse, organize, or search previously uploaded images when creating products or banners.
3. **No Storage Governance**: No storage quotas, orphan asset detection, or file lifecycle policies exist.
4. **Security Vulnerability on KYC**: Private legal documents (PAN, VAT, Citizenship) share the same public storage configuration as public product images.

This RFC defines the architecture for a **Daraz / Shein-grade Multi-Tenant Digital Asset Management (DAM) & Cloud Storage System** utilizing a single Cloudflare R2 bucket with hierarchical key namespacing, Prisma asset metadata cataloging, and Edge CDN dynamic image transformations.

---

## 2. Storage Topology & Namespacing

Hyperscalers (Shein, Daraz/Alibaba OSS, Amazon) do **not** create separate cloud buckets per vendor due to cloud provider bucket limits (100–1,000 max per account) and operational complexity. Instead, strict logical multi-tenancy is enforced via key namespacing.

```
r2-bucket/
├── vendors/
│   ├── {vendorId}/
│   │   ├── products/
│   │   │   └── {uuid}-{sanitizedName}.webp       # Public CDN
│   │   ├── branding/
│   │   │   └── {uuid}-store-banner.webp          # Public CDN
│   │   └── kyc/
│   │       └── {uuid}-pan-registration.pdf       # PRIVATE (No CDN, Signed GET only)
│   └── ...
└── platform/
    ├── categories/
    │   └── {uuid}-category-icon.webp             # Public CDN
    └── banners/
        └── {uuid}-campaign-hero.webp             # Public CDN
```

### Access Tiering:

- **Public CDN Tier** (`vendors/*/products/`, `vendors/*/branding/`, `platform/*`):  
  Cached globally via Cloudflare CDN with `Cache-Control: public, max-age=31536000, immutable`.
- **Private Compliance Tier** (`vendors/*/kyc/`):  
  Blocked on public CDN. Accessible strictly by platform administrators and the owning vendor via temporary signed GET URLs with 15-minute expiration.

---

## 3. Database Schema (Prisma)

To support asset organization, folders, quota enforcement, and duplicate detection, we introduce `MediaAsset` and `MediaFolder` models:

```prisma
// ==========================================
// MULTI-VENDOR MEDIA ASSET MANAGEMENT
// ==========================================

model MediaFolder {
  id          String        @id @default(dbgenerated("gen_random_uuid()"))
  vendorId    String        @map("vendor_id")
  vendor      VendorProfile @relation(fields: [vendorId], references: [id], onDelete: Cascade)

  name        String
  parentId    String?       @map("parent_id")
  parent      MediaFolder?  @relation("FolderHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  subFolders  MediaFolder[] @relation("FolderHierarchy")

  assets      MediaAsset[]

  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@unique([vendorId, parentId, name])
  @@index([vendorId])
}

model MediaAsset {
  id           String        @id @default(dbgenerated("gen_random_uuid()"))
  vendorId     String        @map("vendor_id")
  vendor       VendorProfile @relation(fields: [vendorId], references: [id], onDelete: Cascade)

  folderId     String?       @map("folder_id")
  folder       MediaFolder?  @relation(fields: [folderId], references: [id], onDelete: SetNull)

  originalName String        @map("original_name")
  key          String        @unique // S3 / R2 object key
  url          String        // CDN public URL or private access path

  mimeType     String        @map("mime_type")
  sizeBytes    Int           @map("size_bytes")
  width        Int?
  height       Int?
  aspectRatio  Float?        @map("aspect_ratio")
  hashSha256   String?       @map("hash_sha256") // For deduplication

  // Categorization & Scope
  scope        MediaScope    @default(PRODUCT)
  isPrivate    Boolean       @default(false) @map("is_private")

  // Reference tracking for orphan cleanup
  usageCount   Int           @default(0) @map("usage_count")

  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@index([vendorId, scope])
  @@index([vendorId, folderId])
  @@index([vendorId, hashSha256])
  @@index([vendorId, createdAt])
}

enum MediaScope {
  PRODUCT
  BRANDING
  KYC
  MARKETING
}
```

---

## 4. Storage Quota & Security Enforcement

### 4.1. Tenant-Isolated Presigned Upload Generation

When `POST /api/v1/media/presign` is called:

1. Extract `vendorId` from the authenticated request session (`req.user.vendorId`).
2. Verify total storage consumed:
   ```sql
   SELECT COALESCE(SUM(size_bytes), 0) AS total_used
   FROM "MediaAsset"
   WHERE vendor_id = $1;
   ```
3. If `total_used + requested_bytes > VENDOR_STORAGE_LIMIT_BYTES` (e.g. 5 GB default), reject with `403 QuotaExceededException`.
4. Construct key strictly scoped to tenant:
   ```typescript
   const key = `vendors/${vendorId}/${scope}/${uuidv4()}-${sanitizedFileName}`;
   ```

### 4.2. File Integrity Verification & Magic Byte Check

Direct browser-to-R2 uploads are confirmed via `POST /api/v1/media/confirm`. The backend verifies:

- Object existence on R2 via `HeadObjectCommand`.
- Content-Length matches the reported size within tolerance.
- Key strictly belongs to the calling `vendorId`.

---

## 5. Edge CDN Dynamic Image Resizing

Rather than generating 5 disk copies per uploaded image (thumbnail, mobile PDP, web PDP, zoom), the platform leverages Cloudflare Image Transformations / OSS Edge Processing:

```
Source Image:
https://cdn.celebs.com/vendors/v-123/products/abc-highres.webp

Dynamic Edge Variations:
- Thumbnail (100x100):  https://cdn.celebs.com/cdn-cgi/image/width=100,height=100,fit=crop,quality=80/vendors/v-123/products/abc-highres.webp
- PDP Main (800x1000):  https://cdn.celebs.com/cdn-cgi/image/width=800,quality=85,format=auto/vendors/v-123/products/abc-highres.webp
- Zoom Hi-Res (1600x2000): https://cdn.celebs.com/cdn-cgi/image/width=1600,quality=90/vendors/v-123/products/abc-highres.webp
```

---

## 6. Frontend Media Center (Web-Admin Feature Module)

Under `apps/web-admin/src/features/media/`:

1. **Media Library Dialog**: Pluggable asset picker embedded inside Product Form, Banner Manager, and Store Settings.
2. **Folder Navigation & Bulk Uploader**: Drag-and-drop batch uploader displaying direct chunked presigned upload progress.
3. **Storage Usage Meter**: Visual storage indicator (`2.3 GB of 5.0 GB used`) with warning thresholds at 80% and 95%.
4. **Deduplication Alert**: Notifies vendor if an identical image (matching SHA-256) is already in their library to save quota.

---

## 7. Lifecycle & Orphan Garbage Collection

A background cron job via BullMQ (`assetQueue.process('cleanup-orphans')`):

1. Identifies `MediaAsset` records where `usageCount = 0` and `createdAt < NOW() - 30 days`.
2. Marks assets as `DEPRECATED`.
3. Sends batch deletion commands to Cloudflare R2 / S3 upon final vendor confirmation or after a 14-day grace period.
