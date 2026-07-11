import { Request, Response } from 'express';
import { asyncHandler, HTTPSTATUS, UnauthorizedException } from '@celebs/shared-utils';
import { StaffService } from './staff.service';
import { createStaffSchema, IApiResponse } from '@celebs/shared-types';

export class StaffController {
  private staffService: StaffService;

  constructor(staffService: StaffService) {
    this.staffService = staffService;
  }

  private getUserId(req: Request): string {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return userId;
  }

  public createStaff = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const userId = this.getUserId(req);
      const body = createStaffSchema.parse(req.body);
      const staff = await this.staffService.createStaff(userId, body);
      const response: IApiResponse<typeof staff> = {
        success: true,
        message: 'Staff account created successfully',
        data: staff,
      };
      return res.status(HTTPSTATUS.CREATED).json(response);
    }
  );

  public getStaff = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const userId = this.getUserId(req);
      const staffList = await this.staffService.getStaff(userId);
      const response: IApiResponse<typeof staffList> = {
        success: true,
        message: 'Staff list retrieved successfully',
        data: staffList,
      };
      return res.status(HTTPSTATUS.OK).json(response);
    }
  );

  public deleteStaff = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const userId = this.getUserId(req);
      const { id } = req.params;
      const deleted = await this.staffService.deleteStaff(id, userId);
      const response: IApiResponse<typeof deleted> = {
        success: true,
        message: 'Staff account deleted successfully',
        data: deleted,
      };
      return res.status(HTTPSTATUS.OK).json(response);
    }
  );
}
