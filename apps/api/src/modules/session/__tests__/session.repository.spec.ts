import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';

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
  });
});
