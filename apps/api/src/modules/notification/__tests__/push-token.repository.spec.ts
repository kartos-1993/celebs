import type { PrismaClient } from '@prisma/client';
import type Redis from 'ioredis';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PushTokenRepository } from '../push-token.repository';

describe('PushTokenRepository (TDD - Red Phase)', () => {
  let mockPrisma: {
    pushToken: {
      upsert: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };
  let mockRedis: {
    sadd: ReturnType<typeof vi.fn>;
    srem: ReturnType<typeof vi.fn>;
    smembers: ReturnType<typeof vi.fn>;
  };
  let repository: PushTokenRepository;

  beforeEach(() => {
    mockPrisma = {
      pushToken: {
        upsert: vi
          .fn()
          .mockResolvedValue({ id: 'token-1', userId: 'user-1', token: 'ExponentPushToken[1]' }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn().mockResolvedValue([{ token: 'ExponentPushToken[1]', userId: 'user-1' }]),
      },
    };

    mockRedis = {
      sadd: vi.fn().mockResolvedValue(1),
      srem: vi.fn().mockResolvedValue(1),
      smembers: vi.fn().mockResolvedValue([]),
    };

    repository = new PushTokenRepository(
      mockPrisma as unknown as PrismaClient,
      () => mockRedis as unknown as Redis,
    );
  });

  describe('upsertToken', () => {
    it('should persist token in PostgreSQL and cache in Redis', async () => {
      await repository.upsertToken('user-1', 'ExponentPushToken[test-123]', 'android');

      expect(mockPrisma.pushToken.upsert).toHaveBeenCalledWith({
        where: { userId_token: { userId: 'user-1', token: 'ExponentPushToken[test-123]' } },
        create: { userId: 'user-1', token: 'ExponentPushToken[test-123]', platform: 'android' },
        update: { platform: 'android' },
      });

      expect(mockRedis.sadd).toHaveBeenCalledWith(
        'user:push-tokens:user-1',
        'ExponentPushToken[test-123]',
      );
      expect(mockRedis.sadd).toHaveBeenCalledWith('all:push-tokens', 'ExponentPushToken[test-123]');
    });
  });

  describe('getUserTokens', () => {
    it('should return cached tokens from Redis if available', async () => {
      mockRedis.smembers.mockResolvedValueOnce(['ExponentPushToken[cached-1]']);

      const tokens = await repository.getUserTokens('user-1');

      expect(tokens).toEqual(['ExponentPushToken[cached-1]']);
      expect(mockPrisma.pushToken.findMany).not.toHaveBeenCalled();
    });

    it('should query PostgreSQL on cache miss and warm Redis cache', async () => {
      mockRedis.smembers.mockResolvedValueOnce([]); // Cache miss
      mockPrisma.pushToken.findMany.mockResolvedValueOnce([{ token: 'ExponentPushToken[db-1]' }]);

      const tokens = await repository.getUserTokens('user-1');

      expect(tokens).toEqual(['ExponentPushToken[db-1]']);
      expect(mockPrisma.pushToken.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: { token: true },
      });
      expect(mockRedis.sadd).toHaveBeenCalledWith(
        'user:push-tokens:user-1',
        'ExponentPushToken[db-1]',
      );
    });
  });

  describe('deleteToken', () => {
    it('should remove token from PostgreSQL and Redis sets', async () => {
      await repository.deleteToken('user-1', 'ExponentPushToken[to-delete]');

      expect(mockPrisma.pushToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', token: 'ExponentPushToken[to-delete]' },
      });
      expect(mockRedis.srem).toHaveBeenCalledWith(
        'user:push-tokens:user-1',
        'ExponentPushToken[to-delete]',
      );
      expect(mockRedis.srem).toHaveBeenCalledWith(
        'all:push-tokens',
        'ExponentPushToken[to-delete]',
      );
    });
  });

  describe('deleteInvalidTokens', () => {
    it('should batch delete invalid tokens across PostgreSQL and Redis', async () => {
      const deadTokens = ['ExponentPushToken[dead-1]', 'ExponentPushToken[dead-2]'];

      await repository.deleteInvalidTokens(deadTokens);

      expect(mockPrisma.pushToken.deleteMany).toHaveBeenCalledWith({
        where: { token: { in: deadTokens } },
      });
      expect(mockRedis.srem).toHaveBeenCalledWith('all:push-tokens', ...deadTokens);
    });
  });

  describe('getAllTokensByAudience', () => {
    it('should filter by customer role for CUSTOMERS audience', async () => {
      await repository.getAllTokensByAudience('CUSTOMERS');

      expect(mockPrisma.pushToken.findMany).toHaveBeenCalledWith({
        where: { user: { role: 'CUSTOMER' } },
        select: { userId: true, token: true },
      });
    });

    it('should filter by vendor roles for VENDORS audience', async () => {
      await repository.getAllTokensByAudience('VENDORS');

      expect(mockPrisma.pushToken.findMany).toHaveBeenCalledWith({
        where: { user: { role: { in: ['VENDOR', 'STAFF'] } } },
        select: { userId: true, token: true },
      });
    });

    it('should return all tokens for ALL audience', async () => {
      await repository.getAllTokensByAudience('ALL');

      expect(mockPrisma.pushToken.findMany).toHaveBeenCalledWith({
        select: { userId: true, token: true },
      });
    });
  });
});
