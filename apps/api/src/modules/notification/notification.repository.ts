import { getRedisClient } from '@/common/services/redis-cache.service';

export class NotificationRepository {
  private getUserKey(userId: string): string {
    return `user:push-tokens:${userId}`;
  }

  private getAllKey(): string {
    return 'all:push-tokens';
  }

  async saveUserPushToken(userId: string, token: string): Promise<void> {
    const client = getRedisClient();
    if (!client || !token) return;

    await Promise.all([
      client.sadd(this.getUserKey(userId), token),
      client.sadd(this.getAllKey(), token),
    ]);
  }

  async removeUserPushToken(userId: string, token: string): Promise<void> {
    const client = getRedisClient();
    if (!client || !token) return;

    await Promise.all([
      client.srem(this.getUserKey(userId), token),
      client.srem(this.getAllKey(), token),
    ]);
  }

  async getUserPushTokens(userId: string): Promise<string[]> {
    const client = getRedisClient();
    if (!client || !userId) return [];

    return client.smembers(this.getUserKey(userId));
  }

  async getAllPushTokens(): Promise<string[]> {
    const client = getRedisClient();
    if (!client) return [];

    return client.smembers(this.getAllKey());
  }

  async removeInvalidTokens(tokens: string[]): Promise<void> {
    const client = getRedisClient();
    if (!client || tokens.length === 0) return;

    await client.srem(this.getAllKey(), ...tokens);
  }
}

export const notificationRepository = new NotificationRepository();
