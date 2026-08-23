import { SettingType } from '@prisma/client';

import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { PlatformSettingsRepository, platformSettingsRepository } from './platform-settings.repository';

export class PlatformSettingsService {
  constructor(private readonly repository: PlatformSettingsRepository = platformSettingsRepository) {}

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
      throw new AppError(`Setting "${key}" not found`, HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    this.validateSettingValue(value, setting.type);
    return this.repository.updateSetting(key, value, userId, reason);
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
    reason?: string
  ) {
    const targetType = data.type || 'BOOLEAN';
    this.validateSettingValue(data.value, targetType);

    return this.repository.upsertSetting(
      key,
      {
        ...data,
        updatedBy: userId,
      },
      reason
    );
  }

  async bulkUpdateSettings(
    settings: { key: string; value: string }[],
    userId?: string,
    reason?: string
  ) {
    const validatedSettings: { key: string; value: string }[] = [];

    for (const s of settings) {
      const existing = await this.repository.getSettingByKey(s.key);
      if (!existing) {
        throw new AppError(`Setting "${s.key}" not found`, HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
      }
      this.validateSettingValue(s.value, existing.type);
      validatedSettings.push(s);
    }

    const results = [];
    for (const s of validatedSettings) {
      const updated = await this.repository.updateSetting(s.key, s.value, userId, reason);
      results.push(updated);
    }
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
            ErrorCode.VALIDATION_ERROR
          );
        }
        break;
      }
      case 'NUMBER': {
        if (isNaN(Number(value)) || value.trim() === '') {
          throw new AppError(
            `Invalid numeric value "${value}". Expected a valid number`,
            HTTPSTATUS.BAD_REQUEST,
            ErrorCode.VALIDATION_ERROR
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
            ErrorCode.VALIDATION_ERROR
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
