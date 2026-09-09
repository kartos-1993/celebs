import { Request, Response } from 'express';

import { createUserSchema, updateUserRolePermissionsSchema } from '@celebs/shared-types';
import { asyncHandler } from '@celebs/shared-utils';

import { type UserService, userService } from './user.service';

import { sendCreated, sendSuccess } from '@/common/utils/response.util';

export class UserController {
  private userService: UserService;

  constructor(service: UserService = userService) {
    this.userService = service;
  }

  public getAllUsers = asyncHandler(async (_req: Request, res: Response) => {
    const users = await this.userService.getAllUsers();
    return sendSuccess(res, users, 'Users retrieved successfully');
  });

  public createUser = asyncHandler(async (req: Request, res: Response) => {
    const validated = createUserSchema.parse(req.body);
    const user = await this.userService.createUser(validated);
    return sendCreated(res, user, 'User created successfully');
  });

  public deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const deleted = await this.userService.deleteUser(id);
    return sendSuccess(res, deleted, 'User account deleted successfully');
  });

  public updateUserRoleAndPermissions = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const validated = updateUserRolePermissionsSchema.parse(req.body);
    const updatedUser = await this.userService.updateUserRoleAndPermissions(id, validated);
    return sendSuccess(res, updatedUser, 'User role and permissions updated successfully');
  });
}

export const userController = new UserController();
