import {
  AuthPrincipalData,
  CreateUserType,
  Role,
  UpdateUserRolePermissionsType,
} from '@celebs/shared-types';
import { NotFoundException } from '@celebs/shared-utils';

import { type UserRepository, userRepository } from './user.repository';

import { hashValue } from '@/common/utils/bcrypt';

export interface UserServiceDeps {
  userRepo?: UserRepository;
}

export class UserService {
  private userRepo: UserRepository;

  constructor(deps: UserServiceDeps = {}) {
    this.userRepo = deps.userRepo ?? userRepository;
  }

  public async findUserById(userId: string) {
    return this.userRepo.findUserWithVendor(userId);
  }

  /**
   * Lean identity projection for per-request JWT resolution.
   *
   * Excludes the password hash and wide relations — includes only what
   * actor-context, store guards, and controllers read from `req.user`
   * (id, name, email, role, permissions, isEmailVerified, vendorId,
   * vendorProfile.id). Runs on EVERY authenticated request; keep it tight.
   */
  public async findAuthPrincipal(userId: string): Promise<AuthPrincipalData | null> {
    return this.userRepo.findAuthPrincipal(userId);
  }

  public async getAllUsers() {
    return this.userRepo.findAllUsers();
  }

  public async createUser(data: CreateUserType) {
    const hashedPassword = await hashValue(data.password);
    return this.userRepo.createUser({
      name: data.name,
      email: data.email.toLowerCase(),
      password: hashedPassword,
      role: (data.role as Role) || 'CUSTOMER',
      isEmailVerified: true,
    });
  }

  public async deleteUser(id: string) {
    const user = await this.userRepo.findUserById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.userRepo.deleteUser(id);
  }

  public async updateUserRoleAndPermissions(id: string, data: UpdateUserRolePermissionsType) {
    const user = await this.userRepo.findUserById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.userRepo.updateUserRoleAndPermissions(id, {
      role: (data.role as Role) !== undefined ? (data.role as Role) : user.role,
      permissions: data.permissions !== undefined ? data.permissions : user.permissions,
    });
  }
}

export const userService = new UserService();
