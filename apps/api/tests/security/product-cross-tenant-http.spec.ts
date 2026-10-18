/**
 * Cross-tenant product list boundary — HTTP contract over the live app.
 *
 * Regression specs for the F1 tenant override (a client-supplied `vendorId`
 * must never widen a seller's management list) and the F2 cache policy
 * (credentialed reads must never be marked publicly cacheable on the product
 * routes; anonymous reads keep the public policy with Vary protection).
 */
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { CreateProductType } from '@celebs/shared-types';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import { signJwtToken } from '@/common/utils/jwt';
import prisma from '@/config/db.prisma';
import { ProductService } from '@/modules/product/product.service';

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

const BASE = '/api/v1';
let seq = 0;
const uniq = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++seq}`;

async function mkUser(role: string) {
  const user = await prisma.user.create({
    data: {
      name: `HTTP ${role}`,
      email: `${uniq('http')}@matrix.test`,
      password: await hashValue('Password123!'),
      role: role as never,
      isEmailVerified: true,
    },
  });
  const session = await prisma.session.create({
    data: { userId: user.id, userAgent: 'cross-tenant-http' },
  });
  return { userId: user.id, token: signJwtToken({ userId: user.id, sessionId: session.id }) };
}

async function mkStore(ownerUserId: string) {
  return prisma.vendorProfile.create({
    data: {
      userId: ownerUserId,
      shopName: uniq('HTTP Shop'),
      phoneNumber: uniq('980'),
      panNumber: uniq('PAN'),
      citizenshipNumber: uniq('CIT'),
      status: 'APPROVED',
    },
  });
}

describe('Cross-tenant product list boundary (HTTP)', () => {
  async function buildFixtures() {
    const productService = new ProductService();

    const ownerA = await mkUser('VENDOR');
    const storeA = await mkStore(ownerA.userId);
    const ownerB = await mkUser('VENDOR');
    const storeB = await mkStore(ownerB.userId);

    const category = await prisma.category.create({
      data: {
        name: uniq('HTTP Category'),
        slug: uniq('http-category'),
        level: 1,
        path: uniq('http-path'),
      },
    });

    const mkPayload = (label: string): CreateProductType => ({
      name: `${label} ${uniq('item')}`,
      brand: 'HTTP Brand',
      description: 'Cross-tenant HTTP fixture',
      price: 1500,
      discountedPrice: 1350,
      categoryId: category.id,
      subcategoryId: category.id,
      mainImages: ['https://example.com/item.jpg'],
      colorVariants: [
        {
          name: 'Navy',
          colorCode: '#000080',
          images: ['https://example.com/navy.jpg'],
          stocks: [{ size: 'M', quantity: 3 }],
        },
      ],
      status: 'draft',
    });

    const productA = await productService.createProduct(
      mkPayload('Store A Item'),
      ownerA.userId,
      storeA.id,
      storeA.shopName,
    );
    const productB = await productService.createProduct(
      mkPayload('Store B Item'),
      ownerB.userId,
      storeB.id,
      storeB.shopName,
    );

    return {
      ownerA,
      storeB,
      productAId: String(productA?.id),
      productBId: String(productB?.id),
    };
  }

  it('pins a seller manage-list to their own store even when vendorId points elsewhere', async () => {
    const { ownerA, storeB, productAId, productBId } = await buildFixtures();

    const res = await request(app)
      .get(`${BASE}/products`)
      .query({ manage: 'true', vendorId: storeB.id, limit: 100 })
      .set('Authorization', `Bearer ${ownerA.token}`);

    expect(res.status).toBe(200);
    const ids = (res.body.data.products as Array<{ id: string }>).map((product) => product.id);
    expect(ids).toContain(productAId);
    expect(ids).not.toContain(productBId);
    // F2 — credentialed reads must never be publicly cacheable.
    expect(res.headers['cache-control']).toBe('private, no-store, no-cache, must-revalidate');
  });

  it('rejects manage-mode without a store context instead of falling back to public scope', async () => {
    const customer = await mkUser('CUSTOMER');

    const res = await request(app)
      .get(`${BASE}/products`)
      .query({ manage: 'true' })
      .set('Authorization', `Bearer ${customer.token}`);

    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('SELLER_CONTEXT_REQUIRED');
  });

  it('keeps anonymous storefront reads publicly cacheable with Vary protection', async () => {
    await buildFixtures();

    const res = await request(app).get(`${BASE}/products`).query({ limit: 5 });

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe(
      'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
    );
    const vary = String(res.headers['vary']);
    expect(vary).toContain('Authorization');
    expect(vary).toContain('X-Surface');
  });
});
