import { beforeEach, describe, expect, it } from 'vitest';

import { IStaffRepository, staffRepository } from '../staff.repository';
import { StaffService } from '../staff.service';

import prisma from '@/config/db.prisma';

const createMockStaffRepository = (
  overrides: Partial<IStaffRepository> = {},
): IStaffRepository => ({
  findUserWithVendor: async () => null,
  findVendorProfileById: async () => null,
  findVendorProfileByUserId: async () => null,
  findUserByEmail: async () => null,
  createStaffUser: async () => {
    throw new Error('Not implemented in mock');
  },
  createVerificationCode: async () => {
    throw new Error('Not implemented in mock');
  },
  findAllStaff: async () => [],
  findStaffByVendorId: async () => [],
  findStaffById: async () => null,
  deleteStaff: async () => ({ id: '' }),
  updateStaff: async () => {
    throw new Error('Not implemented in mock');
  },
  ...overrides,
});

describe('StaffRepository & StaffService Clean Architecture Suite', () => {
  let testVendorUserId: string;
  let testVendorProfileId: string;
  let testStaffUserId: string;

  beforeEach(async () => {
    // Create test vendor user & profile
    const vendorUser = await prisma.user.create({
      data: {
        name: 'Staff Suite Vendor',
        email: `staff-suite-vendor-${Date.now()}@example.com`,
        password: 'hashed-password',
        role: 'VENDOR',
        isEmailVerified: true,
      },
    });
    testVendorUserId = vendorUser.id;

    const vendorProfile = await prisma.vendorProfile.create({
      data: {
        userId: vendorUser.id,
        shopName: `Staff Suite Shop ${Date.now()}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        panNumber: `${Math.floor(100000000 + Math.random() * 900000000)}`,
        citizenshipNumber: `11-${Math.floor(100000 + Math.random() * 900000)}`,
      },
    });
    testVendorProfileId = vendorProfile.id;

    // Create a staff user linked to the vendor
    const staffUser = await prisma.user.create({
      data: {
        name: 'Staff Suite Employee',
        email: `staff-suite-emp-${Date.now()}@example.com`,
        password: 'hashed-password',
        role: 'STAFF',
        vendorId: vendorProfile.id,
        isEmailVerified: true,
        permissions: ['PRODUCT_VIEW'],
      },
    });
    testStaffUserId = staffUser.id;
  });

  describe('StaffRepository', () => {
    it('should find user with vendor profile', async () => {
      const user = await staffRepository.findUserWithVendor(testVendorUserId);
      expect(user).not.toBeNull();
      expect(user?.id).toBe(testVendorUserId);
      expect(user?.vendorProfile?.id).toBe(testVendorProfileId);
    });

    it('should find vendor profile by id', async () => {
      const profile = await staffRepository.findVendorProfileById(testVendorProfileId);
      expect(profile).not.toBeNull();
      expect(profile?.id).toBe(testVendorProfileId);
      expect(profile?.userId).toBe(testVendorUserId);
    });

    it('should find vendor profile by userId', async () => {
      const profile = await staffRepository.findVendorProfileByUserId(testVendorUserId);
      expect(profile).not.toBeNull();
      expect(profile?.id).toBe(testVendorProfileId);
    });

    it('should find staff by vendor id', async () => {
      const staffList = await staffRepository.findStaffByVendorId(testVendorProfileId);
      expect(staffList.length).toBeGreaterThan(0);
      expect(staffList.some((s) => s.id === testStaffUserId)).toBe(true);
    });

    it('should update staff member', async () => {
      const updated = await staffRepository.updateStaff(testStaffUserId, {
        name: 'Updated Staff Name',
      });
      expect(updated.name).toBe('Updated Staff Name');
    });
  });

  describe('StaffService DI', () => {
    it('should retrieve staff through injected mock repository without type casting', async () => {
      const mockRepo = createMockStaffRepository({
        findUserWithVendor: async () => ({
          id: 'mock-vendor-user',
          role: 'VENDOR',
          vendorId: null,
          permissions: [],
          vendorProfile: { id: 'mock-vendor-profile-id', shopName: 'Mock Shop' },
        }),
        findStaffByVendorId: async () => [
          {
            id: 'mock-staff-1',
            name: 'Mock Staff 1',
            email: 'mock1@example.com',
            role: 'STAFF',
            permissions: ['PRODUCT_VIEW'],
            isEmailVerified: true,
            vendorId: 'mock-vendor-profile-id',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const service = new StaffService({ staffRepo: mockRepo });
      const staffList = await service.getStaff('mock-vendor-user');
      expect(staffList).toHaveLength(1);
      expect(staffList[0]?.name).toBe('Mock Staff 1');
    });

    it('should throw NotFoundException if user is not found during staff retrieval', async () => {
      const mockRepo = createMockStaffRepository({
        findUserWithVendor: async () => null,
      });

      const service = new StaffService({ staffRepo: mockRepo });
      await expect(service.getStaff('non-existent-user')).rejects.toThrow('User not found');
    });
  });
});
