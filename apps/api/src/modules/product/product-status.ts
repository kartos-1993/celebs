/**
 * Canonical product lifecycle states.
 *
 * Product.status is a plain String column in schema.prisma (unlike
 * OrderStatus, which is a Prisma enum), so these literals are the single
 * source of truth. Never compare against raw strings elsewhere.
 */
export const PRODUCT_STATUS = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  DEACTIVATED: 'deactivated',
  ARCHIVED: 'archived',
} as const;

export type ProductStatusValue = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];

/** Statuses a vendor may still modify (pre-approval lifecycle). */
export const VENDOR_EDITABLE_STATUSES: readonly ProductStatusValue[] = [
  PRODUCT_STATUS.DRAFT,
  PRODUCT_STATUS.REJECTED,
];
