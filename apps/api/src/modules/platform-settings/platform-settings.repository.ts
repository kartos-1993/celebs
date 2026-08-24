import { PlatformSetting, SettingType } from '@prisma/client';

import { AppError, ErrorCode, HTTPSTATUS, logger } from '@celebs/shared-utils';

import prisma from '@/config/db.prisma';
import { upstashRedis } from '@/config/upstash.redis';

interface L1CacheEntry {
  data: PlatformSetting | PlatformSetting[] | null;
  expiresAt: number;
}

export class PlatformSettingsRepository {
  private l1Cache = new Map<string, L1CacheEntry>();
  private readonly L1_TTL_MS = 60 * 1000; // 60s
  private readonly L2_TTL_SEC = 300; // 300s
  private readonly L2_PUBLIC_KEY = 'setting:public_all';

  private getL2Key(key: string): string {
    return `setting:${key}`;
  }

  async getSettingByKey(key: string): Promise<PlatformSetting | null> {
    // 1. Check L1 Memory Cache
    const now = Date.now();
    const l1 = this.l1Cache.get(key);
    if (l1 && l1.expiresAt > now && !Array.isArray(l1.data)) {
      return l1.data;
    }

    // 2. Check L2 Redis Cache
    try {
      const l2Data = await upstashRedis.get<PlatformSetting>(this.getL2Key(key));
      if (l2Data) {
        const parsed = typeof l2Data === 'string' ? JSON.parse(l2Data) : l2Data;
        this.l1Cache.set(key, { data: parsed, expiresAt: now + this.L1_TTL_MS });
        return parsed;
      }
    } catch (err) {
      logger.warn({ err, key }, 'Failed to read platform setting from L2 Redis cache');
    }

    // 3. Fallback to L3 Database
    const setting = await prisma.platformSetting.findUnique({
      where: { key },
    });

    // Populate caches
    this.l1Cache.set(key, { data: setting, expiresAt: now + this.L1_TTL_MS });
    if (setting) {
      try {
        await upstashRedis.set(this.getL2Key(key), JSON.stringify(setting), {
          ex: this.L2_TTL_SEC,
        });
      } catch (err) {
        logger.warn({ err, key }, 'Failed to write platform setting to L2 Redis cache');
      }
    }

    return setting;
  }

  async getPublicSettings(): Promise<PlatformSetting[]> {
    const now = Date.now();
    const l1 = this.l1Cache.get(this.L2_PUBLIC_KEY);
    if (l1 && l1.expiresAt > now && Array.isArray(l1.data)) {
      return l1.data;
    }

    try {
      const l2Data = await upstashRedis.get<PlatformSetting[]>(this.L2_PUBLIC_KEY);
      if (l2Data) {
        const parsed = (
          typeof l2Data === 'string' ? JSON.parse(l2Data) : l2Data
        ) as PlatformSetting[];
        if (Array.isArray(parsed)) {
          this.l1Cache.set(this.L2_PUBLIC_KEY, { data: parsed, expiresAt: now + this.L1_TTL_MS });
          return parsed;
        }
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to read public settings from L2 Redis cache');
    }

    const settings = await prisma.platformSetting.findMany({
      where: { isPublic: true },
      orderBy: { key: 'asc' },
    });

    this.l1Cache.set(this.L2_PUBLIC_KEY, { data: settings, expiresAt: now + this.L1_TTL_MS });
    try {
      await upstashRedis.set(this.L2_PUBLIC_KEY, JSON.stringify(settings), { ex: this.L2_TTL_SEC });
    } catch (err) {
      logger.warn({ err }, 'Failed to write public settings to L2 Redis cache');
    }

    return settings;
  }

  async getAllSettings(group?: string): Promise<PlatformSetting[]> {
    return prisma.platformSetting.findMany({
      where: group ? { group } : undefined,
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });
  }

  async updateSetting(
    key: string,
    value: string,
    changedBy?: string,
    reason?: string,
  ): Promise<PlatformSetting> {
    const existing = await prisma.platformSetting.findUnique({
      where: { key },
    });

    if (!existing) {
      throw new AppError(
        `Setting with key "${key}" not found`,
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const rec = await tx.platformSetting.update({
        where: { key },
        data: {
          value,
          updatedBy: changedBy,
        },
      });

      await tx.platformSettingAudit.create({
        data: {
          settingKey: key,
          oldValue: existing.value,
          newValue: value,
          changedBy: changedBy || 'system',
          reason,
        },
      });

      return rec;
    });

    // Invalidate and write-through cache AFTER transaction commits
    await this.invalidateCache(key);
    this.l1Cache.set(key, { data: updated, expiresAt: Date.now() + this.L1_TTL_MS });
    try {
      await upstashRedis.set(this.getL2Key(key), JSON.stringify(updated), { ex: this.L2_TTL_SEC });
    } catch (err) {
      logger.warn({ err, key }, 'Failed to write-through platform setting to L2 Redis');
    }

    return updated;
  }

  async upsertSetting(
    key: string,
    data: {
      value: string;
      type?: SettingType;
      group?: string;
      label?: string;
      description?: string | null;
      isPublic?: boolean;
      updatedBy?: string | null;
    },
    reason?: string,
  ): Promise<PlatformSetting> {
    const setting = await prisma.$transaction(async (tx) => {
      const existing = await tx.platformSetting.findUnique({ where: { key } });

      const rec = await tx.platformSetting.upsert({
        where: { key },
        create: {
          key,
          value: data.value,
          type: data.type || 'BOOLEAN',
          group: data.group || 'GENERAL',
          label: data.label || key,
          description: data.description,
          isPublic: data.isPublic ?? false,
          updatedBy: data.updatedBy,
        },
        update: {
          value: data.value,
          ...(data.type ? { type: data.type } : {}),
          ...(data.group ? { group: data.group } : {}),
          ...(data.label ? { label: data.label } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
          updatedBy: data.updatedBy,
        },
      });

      await tx.platformSettingAudit.create({
        data: {
          settingKey: key,
          oldValue: existing?.value ?? null,
          newValue: data.value,
          changedBy: data.updatedBy || 'system',
          reason: reason || (existing ? 'Updated setting' : 'Initial creation'),
        },
      });

      return rec;
    });

    // Invalidate and write-through cache AFTER transaction commits
    await this.invalidateCache(key);
    this.l1Cache.set(key, { data: setting, expiresAt: Date.now() + this.L1_TTL_MS });
    try {
      await upstashRedis.set(this.getL2Key(key), JSON.stringify(setting), { ex: this.L2_TTL_SEC });
    } catch (err) {
      logger.warn({ err, key }, 'Failed to write-through platform setting to L2 Redis');
    }

    return setting;
  }

  async getAuditLogs(settingKey?: string, limit = 50) {
    return prisma.platformSettingAudit.findMany({
      where: settingKey ? { settingKey } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        setting: {
          select: {
            label: true,
            group: true,
          },
        },
      },
    });
  }

  async invalidateCache(key?: string): Promise<void> {
    if (key) {
      this.l1Cache.delete(key);
      this.l1Cache.delete(this.L2_PUBLIC_KEY);
      try {
        await Promise.allSettled([
          upstashRedis.del(this.getL2Key(key)),
          upstashRedis.del(this.L2_PUBLIC_KEY),
        ]);
      } catch (err) {
        logger.warn({ err, key }, 'Failed to delete platform setting from L2 Redis cache');
      }
    } else {
      this.l1Cache.clear();
      try {
        await upstashRedis.del(this.L2_PUBLIC_KEY);
      } catch (err) {
        logger.warn({ err }, 'Failed to clear public settings from L2 Redis cache');
      }
    }
  }
}

export const platformSettingsRepository = new PlatformSettingsRepository();
