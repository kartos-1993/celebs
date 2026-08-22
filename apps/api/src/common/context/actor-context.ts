import type { Permission } from '@celebs/rbac';

/**
 * Canonical store lifecycle states. Mirrors VendorProfile.status values.
 * Keep in sync with schema.prisma until StoreStatus becomes a Prisma enum.
 */
export const STORE_STATUSES = [
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
] as const;

export type StoreStatus = (typeof STORE_STATUSES)[number];

export function isStoreStatus(value: unknown): value is StoreStatus {
  return typeof value === 'string' && (STORE_STATUSES as readonly string[]).includes(value);
}

/** The authenticated principal. Built once per request by actorContext middleware. */
export interface Actor {
  userId: string;
  sessionId: string;
  email: string;
  role: string;
  /** Effective permissions: role defaults merged with account-level overrides. */
  permissions: Permission[];
  isEmailVerified: boolean;
}

/**
 * The commercial entity a request acts for.
 * - Sellers (VENDOR owner / STAFF): their store.
 * - Platform actors (ADMIN / SUPERADMIN): null → PLATFORM scope (Celebs 1P).
 * - Customers: null, non-platform.
 */
export interface StoreContext {
  id: string;
  shopName: string;
  status: StoreStatus;
  /** True when the actor owns the store; false for delegated staff accounts. */
  isOwner: boolean;
}

export const isPlatformActor = (actor?: Actor | null): boolean =>
  actor?.role === 'ADMIN' || actor?.role === 'SUPERADMIN';

export const isSellerRole = (actor?: Actor | null): boolean =>
  actor?.role === 'VENDOR' || actor?.role === 'STAFF';
