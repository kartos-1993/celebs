/**
 * Store lifecycle state machine: legal transitions, illegal transitions,
 * CAS concurrency (no last-write-wins), and transactional revocation.
 */
import { describe, expect, it } from 'vitest';

import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';
import {
  assertLegalTransition,
  storeLifecycle,
} from '@/modules/store/store-lifecycle.service';

let seq = 0;
const uniq = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++seq}`;

async function mkStore(status: string) {
  const ownerUser = await prisma.user.create({
    data: {
      name: 'Lifecycle Owner',
      email: `${uniq('lc')}@lifecycle.test`,
      password: await hashValue('Password123!'),
      role: 'VENDOR',
      isEmailVerified: true,
    },
  });
  const store = await prisma.vendorProfile.create({
    data: {
      userId: ownerUser.id,
      shopName: uniq('Lifecycle Shop'),
      phoneNumber: uniq('980'),
      panNumber: uniq('PAN'),
      citizenshipNumber: uniq('CIT'),
      status,
    },
  });
  return { ownerUser, store };
}

describe('assertLegalTransition (pure)', () => {
  const LEGAL: Array<[string, string]> = [
    ['PENDING', 'UNDER_REVIEW'],
    ['PENDING', 'APPROVED'], // admin fast-track
    ['PENDING', 'REJECTED'], // junk-application rejection without review round
    ['PENDING', 'SUSPENDED'], // fraud freeze during onboarding
    ['UNDER_REVIEW', 'APPROVED'],
    ['UNDER_REVIEW', 'REJECTED'],
    ['UNDER_REVIEW', 'SUSPENDED'],
    ['APPROVED', 'SUSPENDED'],
    ['APPROVED', 'REJECTED'], // approval revoked / delisted
    ['SUSPENDED', 'APPROVED'],
    ['SUSPENDED', 'REJECTED'],
    ['REJECTED', 'UNDER_REVIEW'],
  ];
  const ILLEGAL: Array<[string, string]> = [
    ['APPROVED', 'PENDING'],
    ['APPROVED', 'UNDER_REVIEW'],
    ['SUSPENDED', 'UNDER_REVIEW'],
    ['SUSPENDED', 'SUSPENDED'],
    ['REJECTED', 'APPROVED'], // must pass through review again
    ['REJECTED', 'SUSPENDED'],
  ];

  it.each(LEGAL)('allows %s → %s', (from, to) => {
    expect(() => assertLegalTransition(from as never, to as never)).not.toThrow();
  });

  it.each(ILLEGAL)('rejects %s → %s with 409', (from, to) => {
    try {
      assertLegalTransition(from as never, to as never);
      expect.unreachable(`${from} → ${to} should be illegal`);
    } catch (err) {
      expect((err as { statusCode?: number }).statusCode).toBe(409);
    }
  });
});

describe('StoreLifecycleService.transition', () => {
  it('applies a legal transition and returns the updated profile', async () => {
    const { store } = await mkStore('PENDING');
    const updated = await storeLifecycle.transition(store.id, 'APPROVED');
    expect(updated?.status).toBe('APPROVED');
  });

  it('throws NotFound for an unknown store id', async () => {
    await expect(storeLifecycle.transition('00000000-0000-4000-8000-000000000000', 'APPROVED')).rejects.toMatchObject(
      { statusCode: 404 },
    );
  });

  it('CAS: concurrent conflicting transitions — exactly one wins, loser gets 409', async () => {
    const { store } = await mkStore('UNDER_REVIEW');

    const results = await Promise.allSettled([
      storeLifecycle.transition(store.id, 'REJECTED'),
      storeLifecycle.transition(store.id, 'APPROVED'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled').length;
    const rejectedWithConflict = results.filter(
      (r) =>
        r.status === 'rejected' &&
        ((r.reason as { statusCode?: number })?.statusCode ?? 0) === 409,
    ).length;

    expect(fulfilled + rejectedWithConflict).toBe(2);
    // Exactly one writer wins the optimistic lock.
    expect(fulfilled).toBe(1);
    expect(rejectedWithConflict).toBe(1);

    const final = await prisma.vendorProfile.findUniqueOrThrow({ where: { id: store.id } });
    expect(['APPROVED', 'REJECTED']).toContain(final.status);
  });

  it('revokes sessions for owner AND staff when entering SUSPENDED', async () => {
    const { ownerUser, store } = await mkStore('APPROVED');
    const staffUser = await prisma.user.create({
      data: {
        name: 'LC Staff',
        email: `${uniq('stf')}@lifecycle.test`,
        password: 'x',
        role: 'STAFF',
        isEmailVerified: true,
        vendorId: store.id,
      },
    });

    const s1 = await prisma.session.create({ data: { userId: ownerUser.id } });
    const s2 = await prisma.session.create({ data: { userId: staffUser.id } });

    await storeLifecycle.transition(store.id, 'SUSPENDED');

    expect(await prisma.session.findUnique({ where: { id: s1.id } })).toBeNull();
    expect(await prisma.session.findUnique({ where: { id: s2.id } })).toBeNull();
  });

  it('does NOT revoke sessions for non-revoking transitions (approval)', async () => {
    const { ownerUser, store } = await mkStore('UNDER_REVIEW');
    const s1 = await prisma.session.create({ data: { userId: ownerUser.id } });

    await storeLifecycle.transition(store.id, 'APPROVED');

    expect(await prisma.session.findUnique({ where: { id: s1.id } })).not.toBeNull();
  });
});
