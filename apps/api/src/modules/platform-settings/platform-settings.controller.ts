import { NextFunction, Request, Response } from 'express';

import {
  bulkUpdatePlatformSettingsSchema,
  getPlatformSettingAuditLogsQuerySchema,
  getPlatformSettingsQuerySchema,
  settingKeyParamSchema,
  updatePlatformSettingSchema,
  upsertPlatformSettingSchema,
} from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { PlatformSettingsService, platformSettingsService } from './platform-settings.service';

import { sendSuccess } from '@/common/utils/response.util';

export class PlatformSettingsController {
  constructor(private service: PlatformSettingsService = platformSettingsService) {}

  getPublicSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getPublicSettings();
      sendSuccess(res, result, 'Public settings retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getAllSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { group } = getPlatformSettingsQuerySchema.parse(req.query);
      const settings = await this.service.getAllSettings(group);
      sendSuccess(res, settings, 'All platform settings retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getSettingByKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { key } = settingKeyParamSchema.parse(req.params);
      const setting = await this.service.getSettingByKey(key);
      if (!setting) {
        throw new AppError(
          `Setting "${key}" not found`,
          HTTPSTATUS.NOT_FOUND,
          ErrorCode.RESOURCE_NOT_FOUND,
        );
      }
      sendSuccess(res, setting, 'Setting retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  upsertSetting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = upsertPlatformSettingSchema.parse(req.body);
      const userId = req.actor?.userId || req.user?.id;

      const setting = await this.service.upsertSetting(
        validated.key,
        {
          value: validated.value,
          type: validated.type,
          group: validated.group,
          label: validated.label,
          description: validated.description,
          isPublic: validated.isPublic,
        },
        userId,
        validated.reason,
      );

      sendSuccess(res, setting, `Setting "${validated.key}" created/updated successfully`);
    } catch (error) {
      next(error);
    }
  };

  updateSetting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { key } = settingKeyParamSchema.parse(req.params);
      const { value, reason } = updatePlatformSettingSchema.parse(req.body);
      const userId = req.actor?.userId || req.user?.id;
      const updated = await this.service.updateSetting(key, value, userId, reason);

      sendSuccess(res, updated, `Setting "${key}" updated successfully`);
    } catch (error) {
      next(error);
    }
  };

  bulkUpdateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { settings, reason } = bulkUpdatePlatformSettingsSchema.parse(req.body);
      const userId = req.actor?.userId || req.user?.id;
      const updated = await this.service.bulkUpdateSettings(settings, userId, reason);

      sendSuccess(res, updated, `${updated.length} settings updated successfully`);
    } catch (error) {
      next(error);
    }
  };

  getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { key, limit } = getPlatformSettingAuditLogsQuerySchema.parse(req.query);
      const logs = await this.service.getAuditLogs(key, limit);

      sendSuccess(res, logs, 'Platform setting audit logs retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}

export const platformSettingsController = new PlatformSettingsController();
