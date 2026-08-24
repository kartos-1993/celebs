import type { Product } from '@prisma/client';

import type { CreateProductType } from '@celebs/shared-types';

/**
 * Product edit audit trail.
 *
 * Pure functions only — no Prisma, no config, no side effects — so the diff
 * logic is trivially unit-testable and reusable outside the request path.
 */

export interface ProductAuditChange {
  field: string;
  from: string;
  to: string;
}

export interface ProductAuditEntry {
  action: 'edited';
  editorId: string;
  editorRole: string;
  /** True when a platform actor edited another store's product. */
  isCrossStoreEdit: boolean;
  changes: ProductAuditChange[];
  editedAt: Date;
}

/**
 * Fields whose changes are recorded in reviewHistory on every product update.
 *
 * The `satisfies` clause is the safety net: if the Prisma model or the update
 * payload ever drops/renames one of these fields, compilation fails here —
 * no silent drift, no casts.
 * Structural/computed fields (slug, qualityScore, reviewHistory…) are
 * intentionally excluded.
 */
export const AUDITED_PRODUCT_FIELDS = [
  'name',
  'description',
  'price',
  'discountedPrice',
  'brandId',
  'brand',
  'sizes',
  'colorVariants',
  'skus',
  'variantOptions',
  'mainImages',
  'dynamicData',
  'tags',
  'featured',
  'status',
] as const satisfies readonly (keyof Product & keyof CreateProductType)[];

export type AuditedProductField = (typeof AUDITED_PRODUCT_FIELDS)[number];

/** Loose shape so tests can build snapshots without a database fixture. */
export type AuditedProductSnapshot = Record<AuditedProductField, unknown>;

/** Max recorded field changes per update; protects reviewHistory from bloat. */
export const MAX_AUDITED_CHANGES = 25;

const AUDIT_VALUE_LIMIT = 160;

/** Compact human-readable snapshot of a field value for audit diffs. */
export function summarizeAuditValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') {
    return value.length > AUDIT_VALUE_LIMIT ? `${value.slice(0, AUDIT_VALUE_LIMIT)}…` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `${value.length} item(s)`;
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    return keys.length > 0
      ? `{${keys.slice(0, 5).join(', ')}${keys.length > 5 ? ', …' : ''}}`
      : '{}';
  }
  return String(value);
}

function isAuditDifferent(prev: unknown, next: unknown): boolean {
  return JSON.stringify(prev ?? null) !== JSON.stringify(next ?? null);
}

/**
 * Diff an existing product against an update payload across the audited
 * field set, producing bounded human-readable change records.
 */
export function buildProductAuditDiff(
  before: Product | AuditedProductSnapshot,
  after: Partial<Pick<CreateProductType, AuditedProductField>>,
): ProductAuditChange[] {
  const changes: ProductAuditChange[] = [];

  for (const field of AUDITED_PRODUCT_FIELDS) {
    if (changes.length >= MAX_AUDITED_CHANGES) break;

    const next = after[field];
    if (next === undefined) continue;

    const prev = before[field];
    if (!isAuditDifferent(prev, next)) continue;

    changes.push({
      field,
      from: summarizeAuditValue(prev),
      to: summarizeAuditValue(next),
    });
  }

  return changes;
}

/**
 * Platform actors (ADMIN / SUPERADMIN) editing another store's listing.
 * Same-store vendor/staff edits and platform-owned products are false.
 */
export function isCrossStoreProductEdit(
  editorRole: string,
  productVendorId?: string | null,
): boolean {
  return (editorRole === 'ADMIN' || editorRole === 'SUPERADMIN') && Boolean(productVendorId);
}

/** Appends an entry to an untyped persisted history array (JSON column). */
export function appendAuditEntry(existingHistory: unknown, entry: ProductAuditEntry): unknown[] {
  const history = Array.isArray(existingHistory) ? existingHistory : [];
  return [...history, entry];
}
