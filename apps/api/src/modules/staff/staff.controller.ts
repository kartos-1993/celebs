import { Request, Response } from 'express';

import { createStaffSchema } from '@celebs/shared-types';
import { asyncHandler, UnauthorizedException } from '@celebs/shared-utils';

import { StaffService, staffService } from './staff.service';

import { resolveTargetStoreId } from '@/common/guards/store.guards';
import { sendCreated, sendSuccess } from '@/common/utils/response.util';

export class StaffController {
  private staffService: StaffService;

  constructor(service: StaffService = staffService) {
    this.staffService = service;
  }

  private getUserId(req: Request): string {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return userId;
  }

  public createStaff = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req);
    const body = createStaffSchema.parse(req.body);
    const storeId = resolveTargetStoreId(req, 'body');
    const staff = await this.staffService.createStaff(userId, storeId, body);
    return sendCreated(res, staff, 'Staff account created successfully');
  });

  public getStaff = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req);
    const storeId = resolveTargetStoreId(req, 'query');
    const staffList = await this.staffService.getStaff(userId, storeId);
    return sendSuccess(res, staffList, 'Staff list retrieved successfully');
  });

  public deleteStaff = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req);
    const id = req.params.id || '';
    const deleted = await this.staffService.deleteStaff(id, userId);
    return sendSuccess(res, deleted, 'Staff account deleted successfully');
  });

  public updateStaff = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req);
    const id = req.params.id || '';
    const permissions = Array.isArray(req.body.permissions)
      ? (req.body.permissions as string[])
      : undefined;
    const name = typeof req.body.name === 'string' ? req.body.name : undefined;
    const updated = await this.staffService.updateStaff(id, userId, { permissions, name });
    return sendSuccess(res, updated, 'Staff account updated successfully');
  });
}

export const staffController = new StaffController();
