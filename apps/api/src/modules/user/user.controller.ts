import { Request, Response } from 'express';

import {
  createUserSchema,
  IApiResponse,
  updateUserRolePermissionsSchema,
} from '@celebs/shared-types';
import { asyncHandler, HTTPSTATUS } from '@celebs/shared-utils';

import { type UserService, userService } from './user.service';

export class UserController {
  private userService: UserService;

  constructor(service: UserService = userService) {
    this.userService = service;
  }

  public getAllUsers = asyncHandler(async (_req: Request, res: Response) => {
    const users = await this.userService.getAllUsers();
    const response: IApiResponse<typeof users> = {
      success: true,
      message: 'Users retrieved successfully',
      data: users,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public createUser = asyncHandler(async (req: Request, res: Response) => {
    const validated = createUserSchema.parse(req.body);
    const user = await this.userService.createUser(validated);
    const response: IApiResponse<typeof user> = {
      success: true,
      message: 'User created successfully',
      data: user,
    };
    res.status(HTTPSTATUS.CREATED).json(response);
  });

  public deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const deleted = await this.userService.deleteUser(id);
    const response: IApiResponse<typeof deleted> = {
      success: true,
      message: 'User account deleted successfully',
      data: deleted,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public updateUserRoleAndPermissions = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const validated = updateUserRolePermissionsSchema.parse(req.body);
    const updatedUser = await this.userService.updateUserRoleAndPermissions(id, validated);
    const response: IApiResponse<typeof updatedUser> = {
      success: true,
      message: 'User role and permissions updated successfully',
      data: updatedUser,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });
}

export const userController = new UserController();
