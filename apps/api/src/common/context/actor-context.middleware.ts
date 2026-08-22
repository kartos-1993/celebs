import type { NextFunction, Request, Response } from 'express';

import { getUserPermissions } from '@celebs/rbac';
import { UnauthorizedException } from '@celebs/shared-utils';

import prisma from '@/config/db.prisma';
import { isStoreStatus, type Actor, type StoreContext } from './actor-context';

/**
 * Resolves the acting store for a user:
 *  - VENDOR owner: their own VendorProfile (relation wins).
 *  - STAFF: parent store via User.vendorId FK.
 *  - CUSTOMER / platform actors: no candidate → PLATFORM / non-seller scope.
 * Orphaned staff (parent store deleted, FK set to NULL) resolve to no store;
 * Layer-2 guards translate that into ACCOUNT_ORPHANED.
 */
async function resolveStore(
  userId: string,
  role: string,
  candidateStoreId: string | null,
): Promise<StoreContext | null> {
  if (!candidateStoreId) return null;

  const store = await prisma.vendorProfile.findUnique({
    where: { id: candidateStoreId },
    select: { id: true, shopName: true, status: true, userId: true },
  });
  if (!store) return null;

  return {
    id: store.id,
    shopName: store.shopName,
    status: isStoreStatus(store.status) ? store.status : 'PENDING',
    isOwner: role === 'VENDOR' && store.userId === userId,
  };
}

function buildActor(u: NonNullable<Request['user']>): Actor {
  return {
    userId: u.id,
    sessionId: u.sessionId,
    email: u.email ?? '',
    role: u.role ?? 'CUSTOMER',
    permissions: getUserPermissions(u.role ?? 'CUSTOMER', u.permissions),
    isEmailVerified: Boolean(u.isEmailVerified),
  };
}

/** Mount after authenticateJWT on every protected router. */
export const actorContext = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const u = req.user;
    if (!u) {
      throw new UnauthorizedException('Authentication required');
    }

    req.actor = buildActor(u);
    req.store = await resolveStore(u.id, u.role ?? 'CUSTOMER', u.vendorProfile?.id ?? u.vendorId ?? null);
    next();
  } catch (error) {
    next(error);
  }
};

/** Mount after optionalAuthenticateJWT on storefront routes: enriches when a token exists. */
export const optionalActorContext = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const u = req.user;
    if (!u) {
      next();
      return;
    }
    req.actor = buildActor(u);
    req.store = await resolveStore(u.id, u.role ?? 'CUSTOMER', u.vendorProfile?.id ?? u.vendorId ?? null);
    next();
  } catch (error) {
    // Never block storefront reads on context failures.
    next();
  }
};
