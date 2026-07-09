import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '@/app';
import { CategoryModel } from '@/db/models/category.model';
import { AttributeModel } from '@/db/models/attribute.model';
import prisma from '@/db';
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

  it('should allow admin to create a category with attributes', async () => {
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
          variantType: 'size',
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/category')
      .set('Cookie', [adminToken])
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
});
