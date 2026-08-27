import { Request, Response } from 'express';

import { createStaffSchema, IApiResponse } from '@celebs/shared-types';
import { asyncHandler, HTTPSTATUS, UnauthorizedException } from '@celebs/shared-utils';

import { StaffService } from './staff.service';

import { resolveTargetStoreId } from '@/common/guards/store.guards';

export class StaffController {
  private staffService: StaffService;

  constructor(staffService: StaffService) {
    this.staffService = staffService;
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
    const response: IApiResponse<typeof staff> = {
      success: true,
      message: 'Staff account created successfully',
      data: staff,
    };
    res.status(HTTPSTATUS.CREATED).json(response);
  });

  public getStaff = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req);
    const storeId = resolveTargetStoreId(req, 'query');
    const staffList = await this.staffService.getStaff(userId, storeId);
    const response: IApiResponse<typeof staffList> = {
      success: true,
      message: 'Staff list retrieved successfully',
      data: staffList,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public deleteStaff = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req);
    const id = req.params.id || '';
    const deleted = await this.staffService.deleteStaff(id, userId);
    const response: IApiResponse<typeof deleted> = {
      success: true,
      message: 'Staff account deleted successfully',
      data: deleted,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public updateStaff = asyncHandler(async (req: Request, res: Response) => {
    const userId = this.getUserId(req);
    const id = req.params.id || '';
    const permissions = Array.isArray(req.body.permissions)
      ? (req.body.permissions as string[])
      : undefined;
    const name = typeof req.body.name === 'string' ? req.body.name : undefined;
    const updated = await this.staffService.updateStaff(id, userId, { permissions, name });
    const response: IApiResponse<typeof updated> = {
      success: true,
      message: 'Staff account updated successfully',
      data: updated,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });
}
