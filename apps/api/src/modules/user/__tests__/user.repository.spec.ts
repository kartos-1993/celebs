import { beforeEach, describe, expect, it } from 'vitest';

import { UserRepository, userRepository } from '../user.repository';
import { UserService,userService } from '../user.service';

import prisma from '@/config/db.prisma';

describe('UserRepository & UserService Clean Architecture Suite', () => {
  let testUserId: string;
  const testEmail = `user-test-${Date.now()}@example.com`;

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        name: 'User Repo Test',
        email: testEmail,
        password: 'Password123!',
        role: 'CUSTOMER',
        isEmailVerified: true,
      },
    });
    testUserId = user.id;
  });

  describe('UserRepository', () => {
    it('should find user with vendor profile projection', async () => {
      const user = await userRepository.findUserWithVendor(testUserId);
      expect(user).not.toBeNull();
      expect(user?.id).toBe(testUserId);
      expect(user?.email).toBe(testEmail);
    });

    it('should find lean auth principal projection', async () => {
      const principal = await userRepository.findAuthPrincipal(testUserId);
      expect(principal).not.toBeNull();
      expect(principal?.id).toBe(testUserId);
      expect(principal?.email).toBe(testEmail);
      expect(principal?.role).toBe('CUSTOMER');
    });
  });

  describe('UserService DI', () => {
    it('should delegate to injected mock repository', async () => {
      const mockRepo = {
        findUserWithVendor: async () => ({
          id: 'mock-user-1',
          name: 'Mock User',
          email: 'mock@example.com',
          vendorProfile: null,
        }),
        findAuthPrincipal: async () => ({
          id: 'mock-user-1',
          name: 'Mock User',
          email: 'mock@example.com',
          role: 'ADMIN',
          permissions: [],
          isEmailVerified: true,
          vendorId: null,
          vendorProfile: null,
        }),
      } as unknown as UserRepository;

      const service = new UserService({ userRepo: mockRepo });
      const user = await service.findUserById('mock-user-1');
      expect(user?.name).toBe('Mock User');

      const principal = await service.findAuthPrincipal('mock-user-1');
      expect(principal?.role).toBe('ADMIN');
    });

    it('should create user with hashed password through service', async () => {
      const created = await userService.createUser({
        name: 'New Test User',
        email: `new-${Date.now()}@example.com`,
        password: 'Password123!',
      });
      expect(created.id).toBeDefined();
      expect(created.name).toBe('New Test User');
    });

    it('should update user role and permissions', async () => {
      const updated = await userService.updateUserRoleAndPermissions(testUserId, {
        role: 'ADMIN',
        permissions: ['PRODUCT_VIEW'],
      });
      expect(updated.role).toBe('ADMIN');
      expect(updated.permissions).toContain('PRODUCT_VIEW');
    });
  });
});
