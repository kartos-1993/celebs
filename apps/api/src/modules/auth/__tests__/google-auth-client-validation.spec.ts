import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '@/app';
import { config } from '@/config/app.config';

describe('Google authentication configuration boundary', () => {
  it('fails closed when allowed Google client identifiers are unconfigured', async () => {
    // Force ALLOWED_CLIENT_IDS to empty list
    const originalAllowed = config.GOOGLE.ALLOWED_CLIENT_IDS;
    config.GOOGLE.ALLOWED_CLIENT_IDS = [];

    try {
      const res = await request(app).post('/api/v1/auth/google').send({
        idToken: 'simulated.google.jwt.token',
      });

      // Must fail closed with 500 error, refusing to pass audience: undefined
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    } finally {
      config.GOOGLE.ALLOWED_CLIENT_IDS = originalAllowed;
    }
  });
});
