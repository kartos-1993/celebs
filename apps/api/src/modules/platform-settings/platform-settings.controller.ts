import { NextFunction, Request, Response } from 'express';

import {
  bulkUpdatePlatformSettingsSchema,
  updatePlatformSettingSchema,
  upsertPlatformSettingSchema,
} from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { PlatformSettingsService, platformSettingsService } from './platform-settings.service';

export class PlatformSettingsController {
  constructor(private service: PlatformSettingsService = platformSettingsService) {}

  getPublicSettings = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getPublicSettings();
      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Public settings retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = req.query.group as string | undefined;
      const settings = await this.service.getAllSettings(group);
      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'All platform settings retrieved successfully',
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  };

  getSettingByKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.params.key;
      if (!key) {
        throw new AppError('Setting key is required', HTTPSTATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
      }
      const setting = await this.service.getSettingByKey(key);
      if (!setting) {
        throw new AppError(`Setting "${key}" not found`, HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
      }
      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Setting retrieved successfully',
        data: setting,
      });
    } catch (error) {
      next(error);
    }
  };

  upsertSetting = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = upsertPlatformSettingSchema.parse(req.body);
      const userId = (req.user as { id?: string })?.id;

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
        validated.reason
      );

      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: `Setting "${validated.key}" created/updated successfully`,
        data: setting,
      });
    } catch (error) {
      next(error);
    }
  };

  updateSetting = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.params.key;
      if (!key) {
        throw new AppError('Setting key is required', HTTPSTATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
      }

      const { value, reason } = updatePlatformSettingSchema.parse(req.body);
      const userId = (req.user as { id?: string })?.id;
      const updated = await this.service.updateSetting(key, value, userId, reason);

      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: `Setting "${key}" updated successfully`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

  bulkUpdateSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { settings, reason } = bulkUpdatePlatformSettingsSchema.parse(req.body);
      const userId = (req.user as { id?: string })?.id;
      const updated = await this.service.bulkUpdateSettings(settings, userId, reason);

      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: `${updated.length} settings updated successfully`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

  getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.query.key as string | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const logs = await this.service.getAuditLogs(key, limit);

      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Platform setting audit logs retrieved successfully',
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const platformSettingsController = new PlatformSettingsController();
