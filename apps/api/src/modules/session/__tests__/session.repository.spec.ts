import { Role } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SessionRepository, sessionRepository } from '../session.repository';
import { SessionService } from '../session.service';

import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';

describe('SessionRepository & SessionService Clean Architecture Suite', () => {
  const testEmail = `session-test-${Date.now()}@example.com`;
  let testUserId: string;
  let testSessionId: string;

  beforeEach(async () => {
    const hashedPassword = await hashValue('SessionPassword123!');
    const user = await prisma.user.create({
      data: {
        name: 'Session Test User',
        email: testEmail,
        password: hashedPassword,
        isEmailVerified: true,
      },
    });
    testUserId = user.id;

    const session = await prisma.session.create({
      data: {
        userId: testUserId,
        userAgent: 'Integration Test Agent',
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    testSessionId = session.id;
  });

  afterEach(async () => {
    if (testUserId) {
      await prisma.verificationCode.deleteMany({ where: { userId: testUserId } });
      await prisma.session.deleteMany({ where: { userId: testUserId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
  });

  describe('SessionRepository', () => {
    it('should find session with user and vendor relations', async () => {
      const session = await sessionRepository.findSessionWithUser(testSessionId);
      expect(session).toBeDefined();
      expect(session?.id).toBe(testSessionId);
      expect(session?.user.email).toBe(testEmail);
    });

    it('should return null for non-existent session', async () => {
      const session = await sessionRepository.findSessionWithUser(
        '00000000-0000-0000-0000-000000000000',
      );
      expect(session).toBeNull();
    });

    it('deletes expired verification codes without deleting active unexpired codes', async () => {
      const now = new Date();
      // 1. Expired verification code
      const expiredCode = await prisma.verificationCode.create({
        data: {
          userId: testUserId,
          code: `expired-${Date.now()}`,
          type: 'PASSWORD_RESET',
          expiresAt: new Date(now.getTime() - 60000), // 1 minute ago
        },
      });

      // 2. Active unexpired verification code
      const activeCode = await prisma.verificationCode.create({
        data: {
          userId: testUserId,
          code: `active-${Date.now()}`,
          type: 'PASSWORD_RESET',
          expiresAt: new Date(now.getTime() + 60000 * 15), // 15 minutes in future
        },
      });

      const deletedCount = await sessionRepository.deleteExpiredVerificationCodes(now);
      expect(deletedCount).toBeGreaterThanOrEqual(1);

      const foundExpired = await prisma.verificationCode.findUnique({
        where: { id: expiredCode.id },
      });
      expect(foundExpired).toBeNull();

      const foundActive = await prisma.verificationCode.findUnique({
        where: { id: activeCode.id },
      });
      expect(foundActive).not.toBeNull();
    });
  });

  describe('SessionService DI', () => {
    it('should resolve session via injected mock repository', async () => {
      const mockSession = {
        id: 'mock-session-id',
        userId: 'mock-user-id',
        userAgent: 'Mock Agent',
        createdAt: new Date(),
        expiredAt: new Date(),
        user: {
          id: 'mock-user-id',
          name: 'Mock User',
          email: 'mock@example.com',
          role: Role.ADMIN,
          permissions: [],
          isEmailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          vendorId: null,
          vendorProfile: null,
          vendor: null,
        },
      };

      const mockRepo: Partial<SessionRepository> = {
        findSessionWithUser: async () => mockSession,
        deleteExpiredSessions: async () => 0,
      };

      const service = new SessionService({ sessionRepo: mockRepo });
      const result = await service.getSessionById('mock-session-id', 'mock-user-id');

      expect(result.id).toBe('mock-session-id');
      expect(result.user.email).toBe('mock@example.com');
    });

    it('should throw ForbiddenException if actor does not own session', async () => {
      const service = new SessionService();
      await expect(
        service.getSessionById(testSessionId, 'different-actor-user-id'),
      ).rejects.toThrow('You do not own this session');
    });

    it('purges both expired sessions and expired verification codes simultaneously', async () => {
      const now = new Date();
      await prisma.session.create({
        data: {
          userId: testUserId,
          userAgent: 'Expired Worker Test Agent',
          expiredAt: new Date(now.getTime() - 60000),
        },
      });

      await prisma.verificationCode.create({
        data: {
          userId: testUserId,
          code: `expired-purge-${Date.now()}`,
          type: 'PASSWORD_RESET',
          expiresAt: new Date(now.getTime() - 60000),
        },
      });

      const service = new SessionService();
      const result = await service.purgeExpiredSessions();

      expect(result.deletedSessions).toBeGreaterThanOrEqual(1);
      expect(result.deletedCodes).toBeGreaterThanOrEqual(1);
    });
  });
});
