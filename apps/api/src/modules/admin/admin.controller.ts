import { Request, Response } from 'express';

import { createUserSchema, updateUserRolePermissionsSchema } from '@celebs/shared-types';
import { asyncHandler } from '@celebs/shared-utils';

import { AdminService, adminService } from './admin.service';

import { sendCreated, sendSuccess } from '@/common/utils/response.util';

export class AdminController {
  private adminService: AdminService;

  constructor(service: AdminService = adminService) {
    this.adminService = service;
  }

  // Vendor Management
  public getAllVendors = asyncHandler(async (_req: Request, res: Response) => {
    const vendors = await this.adminService.getAllVendors();
    return sendSuccess(res, vendors, 'Vendors retrieved successfully');
  });

  public getVendorById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const vendor = await this.adminService.getVendorById(id);
    return sendSuccess(res, vendor, 'Vendor details retrieved successfully');
  });

  public approveVendor = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const vendor = await this.adminService.approveVendor(id, req.actor?.userId);
    return sendSuccess(res, vendor, 'Vendor approved successfully');
  });

  public rejectVendor = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const { reason } = req.body;
    const vendor = await this.adminService.rejectVendor(id, reason, req.actor?.userId);
    return sendSuccess(res, vendor, 'Vendor rejected successfully');
  });

  public suspendVendor = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const vendor = await this.adminService.suspendVendor(id, req.actor?.userId);
    return sendSuccess(res, vendor, 'Vendor suspended successfully');
  });

  // User Management
  public getAllUsers = asyncHandler(async (_req: Request, res: Response) => {
    const users = await this.adminService.getAllUsers();
    return sendSuccess(res, users, 'Users list retrieved successfully');
  });

  public createUser = asyncHandler(async (req: Request, res: Response) => {
    const body = createUserSchema.parse(req.body);
    const user = await this.adminService.createUser(body);
    return sendCreated(res, user, 'User account created successfully');
  });

  public deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const deleted = await this.adminService.deleteUser(id);
    return sendSuccess(res, deleted, 'User account deleted successfully');
  });

  public updateUserRoleAndPermissions = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const body = updateUserRolePermissionsSchema.parse(req.body);
    const updatedUser = await this.adminService.updateUserRoleAndPermissions(id, body);
    return sendSuccess(res, updatedUser, 'User role and permissions updated successfully');
  });
}

export const adminController = new AdminController();
