import { Request, Response } from 'express';

import { IApiResponse } from '@celebs/shared-types';
import { asyncHandler, HTTPSTATUS } from '@celebs/shared-utils';

import { AdminService, adminService } from './admin.service';

export class AdminController {
  private adminService: AdminService;

  constructor(service: AdminService = adminService) {
    this.adminService = service;
  }

  // Vendor Management
  public getAllVendors = asyncHandler(async (_req: Request, res: Response) => {
    const vendors = await this.adminService.getAllVendors();
    const response: IApiResponse<typeof vendors> = {
      success: true,
      message: 'Vendors retrieved successfully',
      data: vendors,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public getVendorById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const vendor = await this.adminService.getVendorById(id);
    const response: IApiResponse<typeof vendor> = {
      success: true,
      message: 'Vendor details retrieved successfully',
      data: vendor,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public approveVendor = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const vendor = await this.adminService.approveVendor(id, req.actor?.userId);
    const response: IApiResponse<typeof vendor> = {
      success: true,
      message: 'Vendor approved successfully',
      data: vendor,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public rejectVendor = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const { reason } = req.body;
    const vendor = await this.adminService.rejectVendor(id, reason, req.actor?.userId);
    const response: IApiResponse<typeof vendor> = {
      success: true,
      message: 'Vendor rejected successfully',
      data: vendor,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public suspendVendor = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const vendor = await this.adminService.suspendVendor(id, req.actor?.userId);
    const response: IApiResponse<typeof vendor> = {
      success: true,
      message: 'Vendor suspended successfully',
      data: vendor,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  // User Management
  public getAllUsers = asyncHandler(async (_req: Request, res: Response) => {
    const users = await this.adminService.getAllUsers();
    const response: IApiResponse<typeof users> = {
      success: true,
      message: 'Users list retrieved successfully',
      data: users,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public createUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.adminService.createUser(req.body);
    const response: IApiResponse<typeof user> = {
      success: true,
      message: 'User account created successfully',
      data: user,
    };
    res.status(HTTPSTATUS.CREATED).json(response);
  });

  public deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const deleted = await this.adminService.deleteUser(id);
    const response: IApiResponse<typeof deleted> = {
      success: true,
      message: 'User account deleted successfully',
      data: deleted,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public updateUserRoleAndPermissions = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const updatedUser = await this.adminService.updateUserRoleAndPermissions(id, req.body);
    const response: IApiResponse<typeof updatedUser> = {
      success: true,
      message: 'User role and permissions updated successfully',
      data: updatedUser,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });
}

export const adminController = new AdminController();
