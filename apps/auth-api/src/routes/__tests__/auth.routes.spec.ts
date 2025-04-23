import request from 'supertest';
import express from 'express';
import { authRouter } from '../auth.routes';

// Mock dependencies
jest.mock('../../db/index', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('test-token'),
  verify: jest.fn().mockImplementation((token, secret, callback) => {
    if (token === 'valid-token') {
      return { userId: 'user123' };
    } else {
      throw new Error('Invalid token');
    }
  }),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockImplementation((password, hash) => {
    return Promise.resolve(password === 'correct-password');
  }),
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  }),
}));

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRouter);

    // Reset mocks
    jest.clearAllMocks();

    // Setup mock implementations for the DB
    const { prisma } = require('../../db/index');
    prisma.user.findUnique.mockImplementation(({ where }) => {
      if (where.email === 'existing@example.com') {
        return Promise.resolve({
          id: 'user123',
          email: 'existing@example.com',
          password: 'hashed-password',
          name: 'Existing User',
        });
      }
      return Promise.resolve(null);
    });

    prisma.user.create.mockImplementation(({ data }) => {
      return Promise.resolve({
        id: 'new-user-id',
        ...data,
      });
    });
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app).post('/auth/register').send({
        name: 'New User',
        email: 'new@example.com',
        password: 'Password123!',
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty(
        'message',
        'User registered successfully'
      );
      expect(response.body).toHaveProperty('userId');
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app).post('/auth/register').send({
        name: 'New User',
        email: 'invalid-email',
        password: '123', // Too short
      });

      expect(response.status).toBe(400);
    });

    it('should return 409 if email already exists', async () => {
      const { prisma } = require('../../db/index');
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'existing-id',
        email: 'new@example.com',
      });

      const response = await request(app).post('/auth/register').send({
        name: 'New User',
        email: 'new@example.com',
        password: 'Password123!',
      });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(app).post('/auth/login').send({
        email: 'existing@example.com',
        password: 'correct-password',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });

    it('should return 401 with incorrect password', async () => {
      const bcrypt = require('bcryptjs');
      bcrypt.compare.mockResolvedValueOnce(false);

      const response = await request(app).post('/auth/login').send({
        email: 'existing@example.com',
        password: 'wrong-password',
      });

      expect(response.status).toBe(401);
    });

    it('should return 404 if user does not exist', async () => {
      const response = await request(app).post('/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'any-password',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should send a password reset email', async () => {
      const response = await request(app).post('/auth/forgot-password').send({
        email: 'existing@example.com',
      });

      expect(response.status).toBe(200);

      // Check that email was "sent"
      const nodemailer = require('nodemailer');
      expect(nodemailer.createTransport().sendMail).toHaveBeenCalled();
    });

    it('should return 404 if user does not exist', async () => {
      const response = await request(app).post('/auth/forgot-password').send({
        email: 'nonexistent@example.com',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValueOnce({ userId: 'user123' });

      const response = await request(app).post('/auth/reset-password').send({
        token: 'valid-token',
        password: 'NewPassword123!',
      });

      expect(response.status).toBe(200);

      // Check that password was updated
      const { prisma } = require('../../db/index');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should return 400 with invalid token', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app).post('/auth/reset-password').send({
        token: 'invalid-token',
        password: 'NewPassword123!',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /auth/me', () => {
    it('should return user data for authenticated request', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app).get('/auth/me');

      expect(response.status).toBe(401);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});
