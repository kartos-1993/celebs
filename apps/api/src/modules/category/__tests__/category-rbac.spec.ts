import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '@/app';
import prisma from '@/config/db.prisma';
import { config } from '@/config/app.config';
import { hashValue } from '@/common/utils/bcrypt';

describe('Category RBAC & Tree Operations', () => {
  let adminToken: string;
  let vendorToken: string;
  let superadminToken: string;

  beforeEach(async () => {
    // Clean PostgreSQL Users
    await prisma.user.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.product.deleteMany({});

    const hashedPassword = await hashValue('password123');

    // Create an Admin user in postgres
    const adminUser = await prisma.user.create({
      data: {
        name: 'Jane Admin',
        email: 'jane@celebs.com.np',
        password: hashedPassword,
        role: 'ADMIN',
        isEmailVerified: true,
      },
    });

    const vendorUser = await prisma.user.create({
      data: {
        name: 'John Vendor',
        email: 'john@celebs.com.np',
        password: hashedPassword,
        role: 'VENDOR',
        isEmailVerified: true,
      },
    });

    const superadminUser = await prisma.user.create({
      data: {
        name: 'CEO Super',
        email: 'ceo@celebs.com.np',
        password: hashedPassword,
        role: 'SUPERADMIN',
        isEmailVerified: true,
      },
    });

    // Mock session token generator
    const jwt = require('jsonwebtoken');

    // Create mock sessions in postgres database for these users to satisfy setupJwtStrategy check
    const adminSession = await prisma.session.create({
      data: { userId: adminUser.id, userAgent: 'test' },
    });
    const vendorSession = await prisma.session.create({
      data: { userId: vendorUser.id, userAgent: 'test' },
    });
    const superadminSession = await prisma.session.create({
      data: { userId: superadminUser.id, userAgent: 'test' },
    });

    adminToken = `accessToken=${jwt.sign(
      { userId: adminUser.id, sessionId: adminSession.id },
      config.JWT.SECRET,
      { audience: 'user' },
    )}`;
    vendorToken = `accessToken=${jwt.sign(
      { userId: vendorUser.id, sessionId: vendorSession.id },
      config.JWT.SECRET,
      { audience: 'user' },
    )}`;
    superadminToken = `accessToken=${jwt.sign(
      { userId: superadminUser.id, sessionId: superadminSession.id },
      config.JWT.SECRET,
      { audience: 'user' },
    )}`;
  });

  it('should allow superadmin to create a category with attributes', async () => {
    const payload = {
      name: 'Footwear',
      parent: null,
      attributes: [
        {
          name: 'Size',
          type: 'select',
          values: ['UK 7', 'UK 8', 'UK 9'],
          isRequired: true,
          group: 'variant',
          isVariant: true,
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/category')
      .set('Cookie', [superadminToken])
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Footwear');

    // Verify in db
    const cat = await prisma.category.findFirst({ where: { name: 'Footwear' } });
    expect(cat).not.toBeNull();

    const attributes = Array.isArray(cat?.attributes)
      ? (cat!.attributes as Array<{ name: string }>)
      : [];
    expect(attributes.length).toBe(1);
    expect(attributes[0].name).toBe('Size');
  });

  it('should block admin from creating a category', async () => {
    const payload = {
      name: 'Illegal Category',
      parent: null,
      attributes: [],
    };

    const res = await request(app)
      .post('/api/v1/category')
      .set('Cookie', [adminToken])
      .send(payload);

    expect(res.status).toBe(403);
  });

  it('should block vendor from creating a category', async () => {
    const payload = {
      name: 'Illegal Category',
      parent: null,
      attributes: [],
    };

    const res = await request(app)
      .post('/api/v1/category')
      .set('Cookie', [vendorToken])
      .send(payload);

    expect(res.status).toBe(403);
  });

  it('should fetch category tree with attributes successfully', async () => {
    const res = await request(app).get('/api/v1/category/tree-with-attributes');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should update category attribute types and values correctly', async () => {
    const createdCat = await prisma.category.create({
      data: {
        name: 'Apparel',
        slug: 'apparel',
        level: 1,
        path: 'apparel',
        attributes: [
          {
            name: 'Material',
            type: 'text',
            values: ['Cotton'],
            isRequired: false,
          },
        ],
      },
    });

    const updatePayload = {
      attributes: [
        {
          name: 'Material',
          type: 'select',
          values: ['Cotton', 'Polyester', 'Silk'],
          isRequired: true,
        },
      ],
    };

    const res = await request(app)
      .put(`/api/v1/category/${createdCat.id}`)
      .set('Cookie', [superadminToken])
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedCat = await prisma.category.findUnique({ where: { id: createdCat.id } });
    const attributes = Array.isArray(updatedCat?.attributes)
      ? (updatedCat!.attributes as Array<{ name: string; type: string; values: string[] }>)
      : [];
    expect(attributes[0].type).toBe('select');
    expect(attributes[0].values).toContain('Silk');
  });

  describe('Category Deletion Protection (Approach 1)', () => {
    let parentCatId: string;
    let childCatId: string;

    beforeEach(async () => {
      // Create parent category
      const parent = await prisma.category.create({
        data: {
          name: 'Electronics',
          slug: 'electronics',
          level: 1,
          path: 'electronics',
        },
      });
      parentCatId = parent.id;

      // Create child category
      const child = await prisma.category.create({
        data: {
          name: 'Laptops',
          slug: 'laptops',
          level: 2,
          parentCategory: parent.id,
          path: 'electronics/laptops',
        },
      });
      childCatId = child.id;
    });

    it('should block deletion of parent category if it has subcategories', async () => {
      const res = await request(app)
        .delete(`/api/v1/category/${parentCatId}`)
        .set('Cookie', [superadminToken]);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('subcategory');
    });

    it('should block deletion of category if it is assigned to products', async () => {
      // Create mock product in Prisma referencing the child category
      await prisma.product.create({
        data: {
          name: 'MacBook Pro',
          slug: 'macbook-pro',
          description: 'Test laptop description',
          price: 1999,
          categoryId: parentCatId,
          subcategoryId: childCatId,
          mainImages: ['test.jpg'],
          tags: [],
          featured: false,
          status: 'published',
          createdBy: 'test-user',
          updatedBy: 'test-user',
        },
      });

      // Try to delete the child category (which has 1 product assigned)
      const res = await request(app)
        .delete(`/api/v1/category/${childCatId}`)
        .set('Cookie', [superadminToken]);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('product');
    });

    it('should successfully delete category if it has no children and no products', async () => {
      // Delete the child category first (no subcategories, no products assigned)
      const res = await request(app)
        .delete(`/api/v1/category/${childCatId}`)
        .set('Cookie', [superadminToken]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it was removed from PostgreSQL
      const found = await prisma.category.findUnique({ where: { id: childCatId } });
      expect(found).toBeNull();
    });
  });
});
