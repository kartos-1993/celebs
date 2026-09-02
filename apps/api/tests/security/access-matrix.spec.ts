/**
 * Access Control Matrix — contract test for the 3-layer guard pipeline
 * (identity → context enrichment → declarative lifecycle guards → permission).
 *
 * One fixture universe, every actor archetype × every route class.
 * A regression anywhere in jwt.strategy, context middleware, guards, or route
 * wiring shifts a cell and fails this suite with the offending response body.
 */
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import { signJwtToken } from '@/common/utils/jwt';
import prisma from '@/config/db.prisma';

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

const BASE = '/api/v1';
let seq = 0;
const uniq = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++seq}`;

interface ActorHandle {
  userId: string;
  email: string;
  token?: string;
}

async function mkUser(role: string, permissions: string[] = []): Promise<ActorHandle> {
  const user = await prisma.user.create({
    data: {
      name: `Matrix ${role}`,
      email: `${uniq('mx')}@matrix.test`,
      password: await hashValue('Password123!'),
      role: role as never,
      isEmailVerified: true,
      ...(permissions.length ? { permissions } : {}),
    },
  });
  const session = await prisma.session.create({
    data: { userId: user.id, userAgent: 'access-matrix' },
  });
  return {
    userId: user.id,
    email: user.email,
    token: signJwtToken({ userId: user.id, sessionId: session.id }),
  };
}

async function mkStore(status: string) {
  const owner = await mkUser('VENDOR');
  const store = await prisma.vendorProfile.create({
    data: {
      userId: owner.userId,
      shopName: uniq('Matrix Shop'),
      phoneNumber: uniq('980'),
      panNumber: uniq('PAN'),
      citizenshipNumber: uniq('CIT'),
      status,
    },
  });
  return { store, owner };
}

async function mkStaff(storeId: string, permissions: string[] = []): Promise<ActorHandle> {
  const user = await prisma.user.create({
    data: {
      name: 'Matrix Staff',
      email: `${uniq('st')}@matrix.test`,
      password: await hashValue('Password123!'),
      role: 'STAFF',
      isEmailVerified: true,
      permissions,
      vendorId: storeId,
    },
  });
  const session = await prisma.session.create({
    data: { userId: user.id, userAgent: 'access-matrix' },
  });
  return {
    userId: user.id,
    email: user.email,
    token: signJwtToken({ userId: user.id, sessionId: session.id }),
  };
}

type ActorKey =
  | 'anon'
  | 'customer'
  | 'owner'
  | 'staff'
  | 'admin'
  | 'suspOwner'
  | 'suspStaff'
  | 'orphan';

/** [expectedStatus, expectedErrorCode?] */
type Cell = readonly [number, string?];

describe('Access Control Matrix', () => {
  it('enforces identity → context → lifecycle → permission across every route class', async () => {
    // ── fixture universe ──
    const admin = await mkUser('ADMIN');
    const customer = await mkUser('CUSTOMER');

    const approved = await mkStore('APPROVED');
    const staffA = await mkStaff(approved.store.id, ['product:create']);

    const suspended = await mkStore('SUSPENDED');
    const staffB = await mkStaff(suspended.store.id, ['product:create']);

    // Orphaned staff: parent store deleted while account survives (FK → NULL).
    const doomed = await mkStore('APPROVED');
    const orphan = await mkStaff(doomed.store.id);
    await prisma.vendorProfile.delete({ where: { id: doomed.store.id } });

    const category = await prisma.category.create({
      data: { name: uniq('Matrix Cat'), slug: uniq('cat-') },
    });
    const sharedDraft = await prisma.product.create({
      data: {
        name: uniq('Draft'),
        slug: uniq('draft-'),
        price: 1000,
        status: 'draft',
        categoryId: category.id,
        vendorId: approved.store.id,
      },
    });
    const mkFreshDraft = async () =>
      String(
        (
          await prisma.product.create({
            data: {
              name: uniq('Draft'),
              slug: uniq('draft-'),
              price: 1000,
              status: 'draft',
              categoryId: category.id,
              vendorId: approved.store.id,
            },
          })
        ).id,
      );

    const tokens: Record<ActorKey, string | undefined> = {
      anon: undefined,
      customer: customer.token,
      owner: approved.owner.token,
      staff: staffA.token,
      admin: admin.token,
      suspOwner: suspended.owner.token,
      suspStaff: staffB.token,
      orphan: orphan.token,
    };

    const cases: Array<{
      name: string;
      method: 'get' | 'post';
      url: string | (() => Promise<string>);
      body?: Record<string, unknown> | (() => Record<string, unknown>);
      expect: Record<ActorKey, Cell>;
    }> = [
      {
        name: 'seller catalog write (POST /products)',
        method: 'post',
        url: `${BASE}/products`,
        body: {},
        expect: {
          anon: [401],
          customer: [403, 'SELLER_CONTEXT_REQUIRED'],
          owner: [400, 'VALIDATION_ERROR'],
          staff: [400, 'VALIDATION_ERROR'],
          admin: [400, 'VALIDATION_ERROR'],
          suspOwner: [403, 'STORE_SUSPENDED'],
          suspStaff: [403, 'STORE_SUSPENDED'],
          orphan: [403, 'ACCOUNT_ORPHANED'],
        },
      },
      {
        name: 'unpublished draft read (default-deny, no existence leak)',
        method: 'get',
        url: `${BASE}/products/${sharedDraft.id}`,
        expect: {
          anon: [404, 'PRODUCT_NOT_FOUND'],
          customer: [404, 'PRODUCT_NOT_FOUND'],
          owner: [200],
          staff: [200],
          admin: [200],
          suspOwner: [404, 'PRODUCT_NOT_FOUND'],
          suspStaff: [404, 'PRODUCT_NOT_FOUND'],
          orphan: [404, 'PRODUCT_NOT_FOUND'],
        },
      },
      {
        name: 'destructive own-listing operation (archive)',
        method: 'post',
        url: async () => `${BASE}/products/${await mkFreshDraft()}/archive`,
        body: {},
        expect: {
          anon: [401],
          customer: [403, 'SELLER_CONTEXT_REQUIRED'],
          owner: [200],
          // Policy: product:delete is NOT grantable to staff
          // (GRANTABLE_TO_STAFF excludes destructive permissions).
          staff: [403, 'FORBIDDEN_ACCESS'],
          admin: [200],
          // Lifecycle guard fires BEFORE permission checks:
          suspOwner: [403, 'STORE_SUSPENDED'],
          suspStaff: [403, 'STORE_SUSPENDED'],
          orphan: [403, 'ACCOUNT_ORPHANED'],
        },
      },
      {
        name: 'media presign upload gate',
        method: 'post',
        url: `${BASE}/media/presign`,
        body: {},
        expect: {
          anon: [401],
          customer: [403, 'SELLER_CONTEXT_REQUIRED'],
          owner: [400, 'VALIDATION_ERROR'],
          staff: [400, 'VALIDATION_ERROR'],
          admin: [400, 'VALIDATION_ERROR'],
          suspOwner: [403, 'STORE_SUSPENDED'],
          suspStaff: [403, 'STORE_SUSPENDED'],
          orphan: [403, 'ACCOUNT_ORPHANED'],
        },
      },
      {
        name: 'brand LOA submission (owner-context regression: Bug B)',
        method: 'post',
        url: `${BASE}/brands/authorizations`,
        body: {},
        expect: {
          anon: [401],
          customer: [403, 'SELLER_CONTEXT_REQUIRED'],
          owner: [400, 'VALIDATION_ERROR'],
          staff: [400, 'VALIDATION_ERROR'],
          admin: [403, 'SELLER_CONTEXT_REQUIRED'],
          suspOwner: [403, 'STORE_SUSPENDED'],
          suspStaff: [403, 'STORE_SUSPENDED'],
          orphan: [403, 'ACCOUNT_ORPHANED'],
        },
      },
      {
        name: 'staff team management',
        method: 'post',
        url: `${BASE}/staff`,
        body: () => ({
          name: 'New Staff Member',
          email: `${uniq('ns').toLowerCase()}@matrix.test`,
          password: 'Password123!',
          confirmPassword: 'Password123!',
        }),
        expect: {
          anon: [401],
          customer: [403],
          owner: [201],
          staff: [403],
          admin: [400, 'INVALID_REQUEST'],
          suspOwner: [403, 'STORE_SUSPENDED'],
          suspStaff: [403, 'STORE_SUSPENDED'],
          orphan: [403, 'ACCOUNT_ORPHANED'],
        },
      },
      {
        name: 'platform-only product moderation (jurisdiction)',
        method: 'post',
        url: `${BASE}/products/${sharedDraft.id}/review`,
        body: {},
        expect: {
          anon: [401],
          customer: [403],
          owner: [403],
          staff: [403],
          admin: [400, 'VALIDATION_ERROR'],
          suspOwner: [403],
          suspStaff: [403],
          orphan: [403],
        },
      },
    ];

    for (const c of cases) {
      for (const actor of Object.keys(c.expect) as ActorKey[]) {
        const [expectedStatus, expectedCode] = c.expect[actor];
        const url = typeof c.url === 'function' ? await c.url() : c.url;
        const payload = typeof c.body === 'function' ? c.body() : (c.body ?? {});

        const agent = request(app);
        const res = await agent[c.method](url)
          .set(tokens[actor] ? { Authorization: `Bearer ${tokens[actor]}` } : {})
          .send(payload);

        expect(
          res.status,
          `[${c.name}] actor=${actor} → got ${res.status}: ${JSON.stringify(res.body).slice(0, 300)}`,
        ).toBe(expectedStatus);

        if (expectedCode) {
          expect(
            res.body?.errorCode,
            `[${c.name}] actor=${actor} → expected errorCode ${expectedCode}`,
          ).toBe(expectedCode);
        }
      }
    }
  }, 60_000);
});
