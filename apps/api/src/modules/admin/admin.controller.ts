import { Request, Response } from 'express';
import { asyncHandler, HTTPSTATUS } from '@celebs/shared-utils';
import { AdminService } from './admin.service';
import { IApiResponse } from '../../common/interface/api-response.interface';

export class AdminController {
  private adminService: AdminService;

  constructor(adminService: AdminService) {
    this.adminService = adminService;
  }

  // Vendor Management
  public getAllVendors = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const vendors = await this.adminService.getAllVendors();
      const response: IApiResponse<typeof vendors> = {
        success: true,
        message: 'Vendors retrieved successfully',
        data: vendors,
      };
      return res.status(HTTPSTATUS.OK).json(response);
    }
  );

  public getVendorById = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const { id } = req.params;
      const vendor = await this.adminService.getVendorById(id);
      const response: IApiResponse<typeof vendor> = {
        success: true,
        message: 'Vendor details retrieved successfully',
        data: vendor,
      };
      return res.status(HTTPSTATUS.OK).json(response);
    }
  );

  public approveVendor = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const { id } = req.params;
      const vendor = await this.adminService.approveVendor(id);
      const response: IApiResponse<typeof vendor> = {
        success: true,
        message: 'Vendor approved successfully',
        data: vendor,
      };
      return res.status(HTTPSTATUS.OK).json(response);
    }
  );

  public rejectVendor = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const { id } = req.params;
      const { reason } = req.body;
      const vendor = await this.adminService.rejectVendor(id, reason);
      const response: IApiResponse<typeof vendor> = {
        success: true,
        message: 'Vendor rejected successfully',
        data: vendor,
      };
      return res.status(HTTPSTATUS.OK).json(response);
    }
  );

  public suspendVendor = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const { id } = req.params;
      const vendor = await this.adminService.suspendVendor(id);
      const response: IApiResponse<typeof vendor> = {
        success: true,
        message: 'Vendor suspended successfully',
        data: vendor,
      };
      return res.status(HTTPSTATUS.OK).json(response);
    }
  );

  // User Management
  public getAllUsers = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const users = await this.adminService.getAllUsers();
      const response: IApiResponse<typeof users> = {
        success: true,
        message: 'Users list retrieved successfully',
        data: users,
      };
      return res.status(HTTPSTATUS.OK).json(response);
    }
  );

  public createUser = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const user = await this.adminService.createUser(req.body);
      const response: IApiResponse<typeof user> = {
        success: true,
        message: 'User account created successfully',
        data: user,
      };
      return res.status(HTTPSTATUS.CREATED).json(response);
    }
  );

  public deleteUser = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const { id } = req.params;
      const deleted = await this.adminService.deleteUser(id);
      const response: IApiResponse<typeof deleted> = {
        success: true,
        message: 'User account deleted successfully',
        data: deleted,
      };
      return res.status(HTTPSTATUS.OK).json(response);
    }
  );
}
