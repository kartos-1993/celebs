/**
 * R2 / S3 orphan-object reaper.
 *
 * Finds uploaded objects that have no corresponding row in the MediaAsset
 * table (the DAM catalog) and optionally deletes them.
 *
 * Why orphans exist: presigned PUTs write bytes directly to the bucket;
 * the MediaAsset row is only created on POST /media/confirm. Any failure
 * between the two (invalid prefix, tab closed, network drop) leaves a
 * real object that nothing tracks and nothing cleans up.
 *
 * Usage:
 *   pnpm r2:orphans                 # dry-run report (default)
 *   pnpm r2:orphans -- --delete     # actually delete orphans
 *   pnpm r2:orphans -- --older-than-days=30 --prefix=celebs/products
 *
 * Safety rails:
 *  - Objects newer than the cutoff (--older-than-days, default 7) are never
 *    touched: they may belong to uploads still in flight.
 *  - Only the media allowlist prefixes are scanned at all.
 *  - Deletion batches through DeleteObjects (≤1000 keys per call).
 */
import { DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

import { logger } from '@celebs/shared-utils';

import { config } from '@/config/app.config';
import prisma from '@/config/db.prisma';
import { s3Client } from '@/common/utils/s3.client';

const ALLOWED_PREFIXES = ['celebs/products', 'celebs/kyc', 'vendors', 'platform'] as const;

const args = process.argv.slice(2);
const DELETE = args.includes('--delete');
const prefixArg = args.find((a) => a.startsWith('--prefix='));
const daysArg = args.find((a) => a.startsWith('--older-than-days='));
const OLDER_THAN_DAYS = daysArg ? Number(daysArg.split('=')[1]) || 7 : 7;
const SCAN_PREFIX = prefixArg ? prefixArg.split('=')[1] : undefined;

interface S3Object {
  key: string;
  size: number;
  lastModified: Date;
}

async function listBucketObjects(): Promise<S3Object[]> {
  const objects: S3Object[] = [];
  let token: string | undefined;

  do {
    const page = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: config.S3.BUCKET_NAME,
        // Scan the whole bucket, then filter to managed prefixes — catches
        // stray uploads that landed slightly outside the allowlist too.
        ...(SCAN_PREFIX ? { Prefix: SCAN_PREFIX } : {}),
        ContinuationToken: token,
      }),
    );
    for (const obj of page.Contents ?? []) {
      if (!obj.Key) continue;
      objects.push({
        key: obj.Key,
        size: obj.Size ?? 0,
        lastModified: obj.LastModified ?? new Date(0),
      });
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);

  return objects;
}

async function loadKnownKeys(): Promise<Set<string>> {
  const assets = await prisma.mediaAsset.findMany({ select: { key: true, url: true } });
  const known = new Set<string>();
  for (const asset of assets) {
    if (asset.key) known.add(asset.key);
    // Secondary source: derive the key from the stored public URL so legacy
    // rows whose key column predates normalization still count as tracked.
    try {
      const path = new URL(asset.url).pathname.replace(/^\/+/, '');
      if (path) known.add(path);
    } catch {
      // Non-URL value stored — ignore for matching purposes.
    }
  }
  return known;
}

/**
 * Recursively collect every string that looks like a URL or object key from
 * arbitrary JSON blobs (colorVariants, dynamicData, filterConfig…).
 */
function collectUrlishStrings(node: unknown, sink: Set<string>): void {
  if (typeof node === 'string') {
    const trimmed = node.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const path = new URL(trimmed).pathname.replace(/^\/+/, '');
        if (path) {
          sink.add(path);
          sink.add(trimmed);
        }
      } catch {
        sink.add(trimmed);
      }
    } else if (
      ALLOWED_PREFIXES.some((p) => trimmed.startsWith(`${p}/`)) ||
      trimmed.startsWith('platform/')
    ) {
      sink.add(trimmed);
    }
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectUrlishStrings(item, sink);
    return;
  }
  if (node && typeof node === 'object') {
    for (const value of Object.values(node as Record<string, unknown>)) {
      collectUrlishStrings(value, sink);
    }
  }
}

/**
 * Sweep every live domain record that can reference a media object by URL —
 * including legacy rows whose uploads predate the MediaAsset catalog.
 * An object referenced here must NEVER be reaped, even without a DAM row.
 */
async function loadReferencedKeys(): Promise<Set<string>> {
  const refs = new Set<string>();
  const add = (value: unknown) => collectUrlishStrings(value, refs);

  const [products, banners, vendors, campaigns, combos, brands, brandAuths] = await Promise.all([
    prisma.product.findMany({
      select: { mainImages: true, colorVariants: true, dynamicData: true },
    }),
    prisma.banner.findMany({ select: { imageUrl: true } }),
    prisma.vendorProfile.findMany({
      select: {
        storeLogo: true,
        panDocumentUrl: true,
        citizenshipDocumentUrl: true,
        ownerPhotoUrl: true,
        vatDocumentUrl: true,
        businessRegDocumentUrl: true,
      },
    }),
    prisma.campaign.findMany({ select: { bannerImage: true } }),
    prisma.comboBundle.findMany({ select: { bannerImage: true } }),
    prisma.brand.findMany({ select: { logoUrl: true } }),
    prisma.vendorBrandAuthorization.findMany({ select: { documentUrl: true } }),
  ]);

  for (const p of products) {
    add(p.mainImages);
    add(p.colorVariants);
    add(p.dynamicData);
  }
  for (const b of banners) add(b.imageUrl);
  for (const v of vendors) {
    add(v.storeLogo);
    add(v.panDocumentUrl);
    add(v.citizenshipDocumentUrl);
    add(v.ownerPhotoUrl);
    add(v.vatDocumentUrl);
    add(v.businessRegDocumentUrl);
  }
  for (const c of campaigns) add(c.bannerImage);
  for (const c of combos) add(c.bannerImage);
  for (const b of brands) add(b.logoUrl);
  for (const a of brandAuths) add(a.documentUrl);

  return refs;
}

function isManagedPrefix(key: string): boolean {
  return ALLOWED_PREFIXES.some((p) => key === p || key.startsWith(`${p}/`)) ||
    key === 'platform' ||
    key.startsWith('platform/');
}

async function main() {
  logger.info(
    { bucket: config.S3.BUCKET_NAME, mode: DELETE ? 'DELETE' : 'DRY-RUN', olderThanDays: OLDER_THAN_DAYS },
    'R2 orphan reaper starting',
  );

  const [objects, knownKeys, referencedKeys] = await Promise.all([
    listBucketObjects(),
    loadKnownKeys(),
    loadReferencedKeys(),
  ]);
  // A live reference wins even when the DAM row is missing (legacy uploads).
  const protectedKeys = new Set([...knownKeys, ...referencedKeys]);
  const cutoff = Date.now() - OLDER_THAN_DAYS * 24 * 60 * 60 * 1000;

  const candidates = objects.filter((obj) => {
    if (protectedKeys.has(obj.key)) return false;
    if (!isManagedPrefix(obj.key)) return false;
    return obj.lastModified.getTime() <= cutoff;
  });

  logger.info(
    { referencedByLiveRecords: referencedKeys.size },
    'Reference cross-check complete',
  );

  const totalOrphanBytes = candidates.reduce((sum, o) => sum + o.size, 0);
  const byPrefix = candidates.reduce<Record<string, number>>((acc, o) => {
    const matched = ALLOWED_PREFIXES.find((p) => o.key.startsWith(p));
    const prefix: string = matched ?? o.key.split('/')[0] ?? 'root';
    acc[prefix] = (acc[prefix] ?? 0) + 1;
    return acc;
  }, {});

  logger.info(
    {
      scanned: objects.length,
      trackedKeys: knownKeys.size,
      orphans: candidates.length,
      orphanMB: +(totalOrphanBytes / 1024 / 1024).toFixed(2),
      byPrefix,
    },
    'Orphan scan complete',
  );

  for (const obj of candidates.slice(0, 50)) {
    console.log(`  ${(obj.size / 1024).toFixed(1)}KB  ${obj.lastModified.toISOString()}  ${obj.key}`);
  }
  if (candidates.length > 50) console.log(`  … and ${candidates.length - 50} more`);

  if (!DELETE) {
    console.log('\nDry-run only. Re-run with -- --delete to remove these objects.');
    return;
  }

  if (candidates.length === 0) {
    console.log('Nothing to delete.');
    return;
  }

  let deleted = 0;
  for (let i = 0; i < candidates.length; i += 1000) {
    const batch = candidates.slice(i, i + 1000);
    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: config.S3.BUCKET_NAME,
        Delete: {
          Objects: batch.map((o) => ({ Key: o.key })),
          Quiet: true,
        },
      }),
    );
    deleted += batch.length;
    logger.info({ deleted, total: candidates.length }, 'Delete batch committed');
  }

  logger.info({ deleted }, 'R2 orphan reaper finished');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    logger.error({ err }, 'R2 orphan reaper failed');
    await prisma.$disconnect();
    process.exit(1);
  });
