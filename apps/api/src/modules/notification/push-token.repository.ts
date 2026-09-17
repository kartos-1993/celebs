import type { PrismaClient } from '@prisma/client';
import type Redis from 'ioredis';

import { logger } from '@celebs/shared-utils';

import { getRedisClient } from '@/common/services/redis-cache.service';
import defaultPrisma from '@/config/db.prisma';

export class PushTokenRepository {
  constructor(
    private readonly prisma: PrismaClient = defaultPrisma,
    private readonly getRedis: () => Redis | null = getRedisClient,
  ) {}

  private getUserKey(userId: string): string {
    return `user:push-tokens:${userId}`;
  }

  private getAllKey(): string {
    return 'all:push-tokens';
  }

  async upsertToken(userId: string, token: string, platform = 'android'): Promise<void> {
    if (!userId || !token) return;

    // 1. Primary persistence in PostgreSQL
    await this.prisma.pushToken.upsert({
      where: {
        userId_token: { userId, token },
      },
      create: {
        userId,
        token,
        platform,
      },
      update: {
        platform,
      },
    });

    // 2. Cache in Redis Sets
    const redis = this.getRedis();
    if (redis) {
      try {
        await Promise.all([
          redis.sadd(this.getUserKey(userId), token),
          redis.sadd(this.getAllKey(), token),
        ]);
      } catch (err) {
        logger.warn(
          { err, userId, token },
          '[PushTokenRepository] Failed to update Redis push token cache',
        );
      }
    }
  }

  async deleteToken(userId: string, token: string): Promise<void> {
    if (!userId || !token) return;

    // 1. Delete from PostgreSQL
    await this.prisma.pushToken.deleteMany({
      where: { userId, token },
    });

    // 2. Evict from Redis Sets
    const redis = this.getRedis();
    if (redis) {
      try {
        await Promise.all([
          redis.srem(this.getUserKey(userId), token),
          redis.srem(this.getAllKey(), token),
        ]);
      } catch (err) {
        logger.warn(
          { err, userId, token },
          '[PushTokenRepository] Failed to evict token from Redis cache',
        );
      }
    }
  }

  async getUserTokens(userId: string): Promise<string[]> {
    if (!userId) return [];

    const redis = this.getRedis();
    if (redis) {
      try {
        const cachedTokens = await redis.smembers(this.getUserKey(userId));
        if (cachedTokens && cachedTokens.length > 0) {
          return cachedTokens;
        }
      } catch (err) {
        logger.warn(
          { err, userId },
          '[PushTokenRepository] Failed to read cached push tokens from Redis',
        );
      }
    }

    // Cache miss or Redis down: fallback to PostgreSQL
    const records = await this.prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });

    const tokens = records.map((r) => r.token);

    // Warm Redis cache if tokens found
    if (redis && tokens.length > 0) {
      try {
        await redis.sadd(this.getUserKey(userId), ...tokens);
      } catch (err) {
        logger.warn(
          { err, userId },
          '[PushTokenRepository] Failed to warm Redis push tokens cache',
        );
      }
    }

    return tokens;
  }

  async deleteInvalidTokens(tokens: string[]): Promise<void> {
    if (!tokens || tokens.length === 0) return;

    // 1. Batch delete from PostgreSQL
    await this.prisma.pushToken.deleteMany({
      where: { token: { in: tokens } },
    });

    // 2. Remove from global Redis set
    const redis = this.getRedis();
    if (redis) {
      try {
        await redis.srem(this.getAllKey(), ...tokens);
      } catch (err) {
        logger.warn(
          { err, count: tokens.length },
          '[PushTokenRepository] Failed to prune invalid tokens from Redis',
        );
      }
    }
  }

  async getAllTokensByAudience(audience: string): Promise<{ userId: string; token: string }[]> {
    if (audience === 'CUSTOMERS') {
      return this.prisma.pushToken.findMany({
        where: { user: { role: 'CUSTOMER' } },
        select: { userId: true, token: true },
      });
    }

    if (audience === 'VENDORS') {
      return this.prisma.pushToken.findMany({
        where: { user: { role: { in: ['VENDOR', 'STAFF'] } } },
        select: { userId: true, token: true },
      });
    }

    // Default 'ALL'
    return this.prisma.pushToken.findMany({
      select: { userId: true, token: true },
    });
  }
}

export const pushTokenRepository = new PushTokenRepository();
