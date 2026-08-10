import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '@/app';
import prisma from '@/db';

// Mock the mailer to avoid making external HTTP calls
vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Superadmin Setup API Integration Tests', () => {
  const setupPayload = {
    name: 'Initial Super Admin',
    email: 'superadmin@celebs.com',
    password: 'SuperAdminPassword123!',
    setupSecret: 'celebs-superadmin-secret-2026',
  };

  it('should reject setup if setupSecret is incorrect', async () => {
    const res = await request(app)
      .post('/api/v1/auth/setup-superadmin')
      .send({
        ...setupPayload,
        setupSecret: 'wrong-secret',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('secret');
  });

  it('should reject setup if email is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/auth/setup-superadmin')
      .send({
        ...setupPayload,
        email: 'invalid-email',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should successfully create the first SUPERADMIN user with correct secret', async () => {
    const res = await request(app).post('/api/v1/auth/setup-superadmin').send(setupPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(setupPayload.email.toLowerCase());
    expect(res.body.data.role).toBe('SUPERADMIN');
    expect(res.body.data).not.toHaveProperty('password');

    // Verify it exists in the database
    const dbUser = await prisma.user.findUnique({
      where: { email: setupPayload.email.toLowerCase() },
    });
    expect(dbUser).toBeDefined();
    expect(dbUser!.role).toBe('SUPERADMIN');
  });

  it('should reject subsequent setup attempts once a SUPERADMIN exists', async () => {
    // First creation
    await request(app).post('/api/v1/auth/setup-superadmin').send(setupPayload);

    // Second creation attempt
    const res = await request(app)
      .post('/api/v1/auth/setup-superadmin')
      .send({
        ...setupPayload,
        email: 'anotheradmin@celebs.com',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already exists');
  });
});
