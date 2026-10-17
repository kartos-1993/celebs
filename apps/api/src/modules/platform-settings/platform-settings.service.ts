import { SettingType } from '@prisma/client';

import {
  COMMERCE_POLICY_DEFAULTS,
  type CommercePolicy,
  parseCommercePolicy,
} from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS, logger } from '@celebs/shared-utils';

import {
  PlatformSettingsRepository,
  platformSettingsRepository,
} from './platform-settings.repository';

import { invalidateCacheKey } from '@/common/services/redis-cache.service';

export class PlatformSettingsService {
  constructor(
    private readonly repository: PlatformSettingsRepository = platformSettingsRepository,
  ) {}

  /**
   * The business numbers that decide what a customer pays: COD ceiling, delivery
   * fee and the free-delivery threshold.
   *
   * Read through `getPublicSettings`, which is already L1 + L2 cached, so this
   * costs no extra query on the checkout path. A stored value that cannot be
   * used falls back to the shipped default, but is logged rather than swallowed
   * — a bad setting must never quietly become a different charge without a
   * trace.
   */
  async getCommercePolicy(): Promise<CommercePolicy> {
    const settings = await this.repository.getPublicSettings();
    const { policy, invalidKeys } = parseCommercePolicy(
      settings.map((setting) => ({ key: setting.key, value: setting.value })),
    );

    if (invalidKeys.length > 0) {
      logger.warn(
        { invalidKeys, usedDefaults: COMMERCE_POLICY_DEFAULTS },
        'Commerce policy settings unusable; falling back to defaults for those keys',
      );
    }

    return policy;
  }

  async getPublicSettings() {
    const settings = await this.repository.getPublicSettings();
    const result: Record<string, unknown> = {};

    for (const setting of settings) {
      result[setting.key] = this.parseSettingValue(setting.value, setting.type);
    }

    return {
      raw: settings,
      parsed: result,
    };
  }

  async getAllSettings(group?: string) {
    return this.repository.getAllSettings(group);
  }

  async getSettingByKey(key: string) {
    const setting = await this.repository.getSettingByKey(key);
    if (!setting) {
      return null;
    }
    return {
      ...setting,
      parsedValue: this.parseSettingValue(setting.value, setting.type),
    };
  }

  async updateSetting(key: string, value: string, userId?: string, reason?: string) {
    const setting = await this.repository.getSettingByKey(key);
    if (!setting) {
      throw new AppError(
        `Setting "${key}" not found`,
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    this.validateSettingValue(value, setting.type);
    const updated = await this.repository.updateSetting(key, value, userId, reason);
    await invalidateCacheKey('storefront:home');
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
    },
    userId?: string,
    reason?: string,
  ) {
    const targetType = data.type || 'BOOLEAN';
    this.validateSettingValue(data.value, targetType);

    const upserted = await this.repository.upsertSetting(
      key,
      {
        ...data,
        updatedBy: userId,
      },
      reason,
    );
    await invalidateCacheKey('storefront:home');
    return upserted;
  }

  async bulkUpdateSettings(
    settings: { key: string; value: string }[],
    userId?: string,
    reason?: string,
  ) {
    const validatedSettings: { key: string; value: string }[] = [];

    for (const s of settings) {
      const existing = await this.repository.getSettingByKey(s.key);
      if (!existing) {
        throw new AppError(
          `Setting "${s.key}" not found`,
          HTTPSTATUS.NOT_FOUND,
          ErrorCode.RESOURCE_NOT_FOUND,
        );
      }
      this.validateSettingValue(s.value, existing.type);
      validatedSettings.push(s);
    }

    const results = [];
    for (const s of validatedSettings) {
      const updated = await this.repository.updateSetting(s.key, s.value, userId, reason);
      results.push(updated);
    }

    await invalidateCacheKey('storefront:home');
    return results;
  }

  async getAuditLogs(settingKey?: string, limit?: number) {
    return this.repository.getAuditLogs(settingKey, limit);
  }

  private validateSettingValue(value: string, type: SettingType): void {
    switch (type) {
      case 'BOOLEAN': {
        const lower = value.toLowerCase().trim();
        if (lower !== 'true' && lower !== 'false' && lower !== '1' && lower !== '0') {
          throw new AppError(
            `Invalid boolean value "${value}". Expected "true" or "false"`,
            HTTPSTATUS.BAD_REQUEST,
            ErrorCode.VALIDATION_ERROR,
          );
        }
        break;
      }
      case 'NUMBER': {
        if (isNaN(Number(value)) || value.trim() === '') {
          throw new AppError(
            `Invalid numeric value "${value}". Expected a valid number`,
            HTTPSTATUS.BAD_REQUEST,
            ErrorCode.VALIDATION_ERROR,
          );
        }
        break;
      }
      case 'JSON': {
        try {
          JSON.parse(value);
        } catch {
          throw new AppError(
            `Invalid JSON value "${value}". Expected a valid JSON string`,
            HTTPSTATUS.BAD_REQUEST,
            ErrorCode.VALIDATION_ERROR,
          );
        }
        break;
      }
      case 'STRING':
      default:
        break;
    }
  }

  private parseSettingValue(value: string, type: SettingType): unknown {
    switch (type) {
      case 'BOOLEAN':
        return value.toLowerCase() === 'true' || value === '1';
      case 'NUMBER':
        return Number(value);
      case 'JSON':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      case 'STRING':
      default:
        return value;
    }
  }
}

export const platformSettingsService = new PlatformSettingsService();
