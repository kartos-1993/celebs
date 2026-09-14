import {
  ErrorCode,
  ForbiddenException,
  HttpException,
  HTTPSTATUS,
  logger,
  NotFoundException,
} from '@celebs/shared-utils';

import { sessionRepository } from '../session/session.repository';
import { userRepository } from '../user/user.repository';
import { vendorRepository } from '../vendor/vendor.repository';

import { authCache } from '@/common/cache/auth-cache';
import type { StoreStatus } from '@/common/context/actor-context';

/**
 * Legal store lifecycle transitions.
 * All status mutations MUST go through StoreLifecycleService.transition() —
 * direct `prisma.vendorProfile.update({ data: { status } })` elsewhere is a bug.
 */
const STORE_TRANSITIONS: Record<StoreStatus, readonly StoreStatus[]> = {
  PENDING: ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'SUSPENDED'],
  APPROVED: ['SUSPENDED', 'REJECTED'], // REJECTED = approval revoked / delisted
  SUSPENDED: ['APPROVED', 'REJECTED'],
  REJECTED: ['UNDER_REVIEW'],
};

/** Terminal-for-access states: entering them kills every member session immediately. */
const STATES_REVOKING_ACCESS = new Set<StoreStatus>(['SUSPENDED', 'REJECTED']);

export function assertLegalTransition(from: StoreStatus, to: StoreStatus): void {
  const allowed = STORE_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new HttpException(`Illegal store transition: ${from} → ${to}`, HTTPSTATUS.CONFLICT);
  }
}

export class StoreLifecycleService {
  /**
   * CAS-guarded transition. Concurrent conflicting transitions fail with 409
   * instead of last-write-wins clobbering (approve vs suspend races).
   */
  public async transition(
    storeId: string,
    to: StoreStatus,
    ctx: {
      actorUserId?: string;
      reason?: string;
      extraData?: Record<string, unknown>;
    } = {},
  ) {
    const store = await vendorRepository.findStatusById(storeId);
    if (!store) {
      throw new NotFoundException('Vendor profile not found');
    }
    const from = store.status as StoreStatus;
    assertLegalTransition(from, to);

    const count = await vendorRepository.updateStatusCas(storeId, from, to, ctx.extraData);
    if (count === 0) {
      throw new HttpException('Store state changed concurrently, retry', HTTPSTATUS.CONFLICT);
    }

    if (STATES_REVOKING_ACCESS.has(to)) {
      await this.revokeStoreSessions(storeId);
    }

    logger.info(
      { storeId, from, to, actorUserId: ctx.actorUserId ?? 'system', reason: ctx.reason },
      'Store lifecycle transition',
    );

    return vendorRepository.findStoreWithUser(storeId);
  }

  /**
   * Kills owner AND staff sessions. JWTs stay cryptographically valid but die
   * on next use because the strategy validates session existence per request.
   */
  public async revokeStoreSessions(storeId: string): Promise<number> {
    const memberIds = await vendorRepository.findStoreMemberUserIds(storeId);
    if (memberIds.length === 0) return 0;

    const doomed = await sessionRepository.findSessionsByUserIds(memberIds);
    const count = await sessionRepository.deleteSessionsByUserIds(memberIds);

    // Keep the Redis identity cache honest — revocation must stay instant.
    if (doomed.length > 0) {
      await authCache.invalidateSessions(doomed.map((s) => s.id));
    }

    logger.info({ storeId, revokedSessions: count }, 'Store sessions revoked');
    return count;
  }

  /**
   * Authentication-boundary gate shared by login / refresh / google sign-in.
   * Covers owners AND staff of the parent store — closing the staff loophole.
   * Only SUSPENDED blocks token issuance; PENDING/UNDER_REVIEW/REJECTED users
   * may authenticate but seller surfaces stay gated by Layer-2 guards.
   */
  public async assertSellerLoginAllowed(user: { id: string; role: string }): Promise<void> {
    if (user.role !== 'VENDOR' && user.role !== 'STAFF') return;

    const record = await userRepository.findSellerStatus(user.id);

    const status = record?.vendorProfile?.status ?? record?.vendor?.status;
    if (status === 'SUSPENDED') {
      throw new ForbiddenException(
        'Access denied: your seller account has been suspended. Please contact support.',
        ErrorCode.STORE_SUSPENDED,
      );
    }
  }
}

export const storeLifecycle = new StoreLifecycleService();
