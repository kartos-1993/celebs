import type { NextFunction, Request, Response } from 'express';

import { ErrorCode, ForbiddenException, UnauthorizedException } from '@celebs/shared-utils';

import { isPlatformActor, isSellerRole, type StoreStatus } from '@/common/context/actor-context';

/**
 * Layer 2 — declarative guards.
 * Guards read ONLY req.actor / req.store (built by Layer 1). They never touch
 * raw req.user, so controllers and strategies stay free of lifecycle logic.
 */

const SELLER_CONTEXT_MESSAGE = 'This operation requires a seller store context.';

function noStoreError(role: string): ForbiddenException | UnauthorizedException {
  // Staff accounts whose parent store was deleted (FK set to NULL) are orphaned.
  if (role === 'STAFF') {
    return new ForbiddenException(
      'Access denied: your account is no longer linked to an active store. Please contact support.',
      ErrorCode.ACCOUNT_ORPHANED,
    );
  }
  if (isSellerRole({ role } as never) || role === 'CUSTOMER') {
    return new ForbiddenException(SELLER_CONTEXT_MESSAGE, ErrorCode.SELLER_CONTEXT_REQUIRED);
  }
  return new UnauthorizedException('Authentication required');
}

/** Route requires a seller store context (3P seller operations). */
export const requireSellerContext = (req: Request, _res: Response, next: NextFunction) => {
  const { actor, store } = req;
  if (!actor) {
    return next(new UnauthorizedException('Authentication required'));
  }
  if (!store) {
    return next(noStoreError(actor.role));
  }
  next();
};

/**
 * Route requires the acting store to be in one of the given lifecycle states.
 * Platform actors bypass by default — Celebs 1P publishes without KYC gates.
 * Email verification is enforced for every seller actor (owner AND staff).
 */
export const requireStoreState =
  (allowed: StoreStatus[], opts: { adminBypass?: boolean; requireVerifiedEmail?: boolean } = {}) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const { adminBypass = true, requireVerifiedEmail = true } = opts;
    const { actor, store } = req;

    if (!actor) {
      return next(new UnauthorizedException('Authentication required'));
    }

    if (isPlatformActor(actor) && adminBypass) {
      return next();
    }

    if (!store) {
      return next(noStoreError(actor.role));
    }

    if (requireVerifiedEmail && isSellerRole(actor) && !actor.isEmailVerified) {
      return next(
        new ForbiddenException(
          'Email address is not verified. Please check your inbox for the verification link.',
          ErrorCode.EMAIL_UNVERIFIED,
        ),
      );
    }

    if (!allowed.includes(store.status)) {
      return next(mapStoreStatusToError(store.status));
    }

    next();
  };

/**
 * Jurisdiction gate for /admin surfaces. Permission checks alone are not enough:
 * a staff member with a custom VENDOR_MANAGE grant must never reach platform
 * operations. Platform = ADMIN / SUPERADMIN (no seller store scope).
 */
export const requirePlatformActor = (req: Request, _res: Response, next: NextFunction) => {
  const { actor } = req;
  if (!actor) {
    return next(new UnauthorizedException('Authentication required'));
  }
  if (!isPlatformActor(actor)) {
    return next(
      new ForbiddenException(
        'This operation is restricted to platform administrators.',
        ErrorCode.PLATFORM_ACCESS_REQUIRED,
      ),
    );
  }
  next();
};

/** Maps a disallowed store state to a precise client-actionable error. */
export function mapStoreStatusToError(status: StoreStatus): ForbiddenException {
  if (status === 'SUSPENDED') {
    return new ForbiddenException(
      'Access denied: your seller account has been suspended. Please contact support.',
      ErrorCode.STORE_SUSPENDED,
    );
  }
  const reason =
    status === 'REJECTED'
      ? 'Your seller application was rejected.'
      : status === 'UNDER_REVIEW'
        ? 'Your seller application is under review.'
        : 'Your seller profile must be approved before accessing this area.';
  return new ForbiddenException(
    `${reason} Access denied until the store is approved by platform administration.`,
    ErrorCode.STORE_NOT_APPROVED,
  );
}

/**
 * Single source of truth for "which store does this request target".
 * - Sellers are ALWAYS scoped to their own store; client-supplied vendorId
 *   params are ignored (prevents cross-store targeting).
 * - Platform actors may pass ?vendorId= / body.vendorId explicitly;
 *   absent param → null → PLATFORM-owned scope (vendorId IS NULL rows).
 * Returns `string | null` only — repositories must never receive `undefined`.
 */
export function resolveTargetStoreId(
  req: Request,
  source: 'query' | 'body' = 'query',
): string | null {
  const { actor, store } = req;
  if (!actor) {
    throw new UnauthorizedException('Authentication required');
  }

  if (isPlatformActor(actor)) {
    const raw = source === 'query' ? req.query.vendorId : req.body?.vendorId;
    return typeof raw === 'string' && raw.length > 0 ? raw : null;
  }

  if (!store) {
    throw noStoreError(actor.role);
  }
  return store.id;
}
