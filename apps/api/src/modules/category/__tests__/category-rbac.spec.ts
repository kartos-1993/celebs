import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '@/app';
import { CategoryModel, ICategory } from '@/db/models/category.model';
import { AttributeModel } from '@/db/models/attribute.model';
import { ProductModel } from '@/db/models/product.model';
import prisma from '@/db';
import mongoose from 'mongoose';
import { config } from '@/config/app.config';
import { hashValue } from '@/common/utils/bcrypt';

describe('Category RBAC & Tree Operations', () => {
  let adminToken: string;
  let vendorToken: string;
  let superadminToken: string;

  beforeEach(async () => {
    // Clean PostgreSQL Users
    await prisma.user.deleteMany({});
    
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
      data: { userId: adminUser.id, userAgent: 'test' }
    });
    const vendorSession = await prisma.session.create({
      data: { userId: vendorUser.id, userAgent: 'test' }
    });
    const superadminSession = await prisma.session.create({
      data: { userId: superadminUser.id, userAgent: 'test' }
    });

    adminToken = `accessToken=${jwt.sign(
      { userId: adminUser.id, sessionId: adminSession.id },
      config.JWT.SECRET,
      { audience: 'user' }
    )}`;
    vendorToken = `accessToken=${jwt.sign(
      { userId: vendorUser.id, sessionId: vendorSession.id },
      config.JWT.SECRET,
      { audience: 'user' }
    )}`;
    superadminToken = `accessToken=${jwt.sign(
      { userId: superadminUser.id, sessionId: superadminSession.id },
      config.JWT.SECRET,
      { audience: 'user' }
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
    const cat = await CategoryModel.findOne({ name: 'Footwear' });
    expect(cat).toBeDefined();

    const attributes = await AttributeModel.find({ categoryId: cat!._id });
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
    const res = await request(app)
      .get('/api/v1/category/tree-with-attributes')
      .set('Cookie', [vendorToken]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should update category attribute types and values correctly', async () => {
    // 1. Create a category
    const createRes = await request(app)
      .post('/api/v1/category')
      .set('Cookie', [superadminToken])
      .send({
        name: 'Mens Mechanical Watches',
        parent: null,
        attributes: [
          {
            name: 'Style',
            type: 'text',
            values: [],
            isRequired: false,
            group: 'details',
          },
          {
            name: 'Strap Color',
            type: 'select',
            values: ['black'],
            isRequired: false,
            group: 'variant',
            isVariant: true,
          },
        ],
      });

    expect(createRes.status).toBe(201);
    const categoryId = createRes.body.data._id;
    const existingAttrs = createRes.body.data.attributes;
    expect(existingAttrs.length).toBe(2);

    // 2. Update category: change Style to select with values, update Strap Color values
    const updatePayload = {
      name: 'Mens Mechanical Watches',
      parent: null,
      attributes: [
        {
          _id: existingAttrs[0]._id,
          name: 'Style',
          type: 'select',
          values: [
            'Casual',
            'Elegant',
            'Vintage',
            'Sporty',
            'Business',
          ],
          isRequired: false,
          group: 'details',
        },
        {
          _id: existingAttrs[1]._id,
          name: 'Strap Color',
          type: 'multiselect',
          values: ['gold', 'silver'],
          isRequired: false,
          group: 'variant',
          isVariant: true,
        },
      ],
    };

    const updateRes = await request(app)
      .put(`/api/v1/category/${categoryId}`)
      .set('Cookie', [superadminToken])
      .send(updatePayload);

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    const updatedAttrs = updateRes.body.data.attributes;

    const styleAttr = updatedAttrs.find((a: any) => a.name === 'Style');
    expect(styleAttr).toBeDefined();
    expect(styleAttr.type).toBe('select');
    expect(styleAttr.values).toEqual(['Casual', 'Elegant', 'Vintage', 'Sporty', 'Business']);

    const strapAttr = updatedAttrs.find((a: any) => a.name === 'Strap Color');
    expect(strapAttr).toBeDefined();
    expect(strapAttr.type).toBe('multiselect');
    expect(strapAttr.values).toEqual(['gold', 'silver']);
  });

  describe('Category Deletion Protection (Approach 1)', () => {
    let parentCatId: string;
    let childCatId: string;

    beforeEach(async () => {
      // Clean MongoDB collections
      await CategoryModel.deleteMany({});
      await ProductModel.deleteMany({});

      // Create parent category
      const parent = await CategoryModel.create({
        name: 'Electronics',
        slug: 'electronics',
        level: 1,
        path: ['electronics'],
      });
      parentCatId = (parent as ICategory)._id.toString();

      // Create child category
      const child = await CategoryModel.create({
        name: 'Laptops',
        slug: 'laptops',
        level: 2,
        parentCategory: (parent as ICategory)._id,
        path: ['electronics', 'laptops'],
      });
      childCatId = (child as ICategory)._id.toString();
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
      // Create mock product in MongoDB referencing the child category
      await ProductModel.create({
        name: 'MacBook Pro',
        slug: 'macbook-pro',
        description: 'Test laptop description',
        price: 1999,
        category: new mongoose.Types.ObjectId(parentCatId),
        subcategory: new mongoose.Types.ObjectId(childCatId),
        sizes: [],
        colorVariants: [],
        mainImages: ['test.jpg'],
        tags: [],
        featured: false,
        status: 'published',
        createdBy: 'test-user',
        updatedBy: 'test-user',
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

      // Verify it was removed from MongoDB
      const found = await CategoryModel.findById(childCatId);
      expect(found).toBeNull();
    });
  });
});
