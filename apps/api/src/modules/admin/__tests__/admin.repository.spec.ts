import { beforeEach, describe, expect, it } from 'vitest';

import {
  adminRepository,
  AdminUserCreatedRecord,
  AdminVendorItem,
  IAdminRepository,
} from '../admin.repository';
import { AdminService } from '../admin.service';

import prisma, { Prisma } from '@/config/db.prisma';

const createMockVendorProfile = (overrides: Partial<AdminVendorItem> = {}): AdminVendorItem => ({
  id: 'mock-vendor-id-1',
  userId: 'mock-user-1',
  phoneNumber: '9800000000',
  shopName: 'Mock Electronics',
  shopDescription: null,
  panNumber: '123456789',
  citizenshipNumber: '11-22-33',
  panDocumentUrl: null,
  citizenshipDocumentUrl: null,
  ownerPhotoUrl: null,
  payoutDetails: null,
  status: 'APPROVED',
  availableBalance: new Prisma.Decimal(0),
  withholdingEscrow: new Prisma.Decimal(0),
  currencyCode: 'NPR',
  createdAt: new Date(),
  updatedAt: new Date(),
  storeLogo: null,
  businessName: null,
  businessRegNumber: null,
  businessPhoneNumber: null,
  vatDocumentUrl: null,
  businessRegDocumentUrl: null,
  holidayMode: false,
  onboardingStep: 1,
  rejectionReason: null,
  recentCategories: [],
  user: {
    id: 'mock-user-1',
    name: 'Mock User',
    email: 'mock@example.com',
    isEmailVerified: true,
    createdAt: new Date(),
  },
  warehouses: [],
  ...overrides,
});

const createMockAdminRepository = (
  overrides: Partial<IAdminRepository> = {},
): IAdminRepository => ({
  findAllVendors: async () => [],
  findVendorById: async () => null,
  findAllUsers: async () => [],
  createUser: async () => {
    throw new Error('Not implemented in mock');
  },
  findUserById: async () => null,
  deleteUser: async () => ({ id: '' }),
  updateUserRoleAndPermissions: async () => {
    throw new Error('Not implemented in mock');
  },
  ...overrides,
});

describe('AdminRepository & AdminService Clean Architecture Suite', () => {
  let testUserId: string;
  let testVendorProfileId: string;

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Admin Repo Test Vendor',
        email: `admin-repo-vendor-${Date.now()}@example.com`,
        password: 'hashed-password-123',
        role: 'VENDOR',
        isEmailVerified: true,
      },
    });
    testUserId = user.id;

    const vendorProfile = await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        shopName: `Admin Repo Shop ${Date.now()}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        panNumber: `${Math.floor(100000000 + Math.random() * 900000000)}`,
        citizenshipNumber: `11-${Math.floor(100000 + Math.random() * 900000)}`,
      },
    });
    testVendorProfileId = vendorProfile.id;
  });

  describe('AdminRepository', () => {
    it('should find all vendors with user and warehouse relations', async () => {
      const vendors = await adminRepository.findAllVendors();
      expect(vendors.length).toBeGreaterThan(0);
      const target = vendors.find((v) => v.id === testVendorProfileId);
      expect(target).toBeDefined();
      expect(target?.user.email).toBeDefined();
    });

    it('should find a vendor by id with relations', async () => {
      const vendor = await adminRepository.findVendorById(testVendorProfileId);
      expect(vendor).not.toBeNull();
      expect(vendor?.id).toBe(testVendorProfileId);
      expect(vendor?.user.id).toBe(testUserId);
    });

    it('should find all users', async () => {
      const users = await adminRepository.findAllUsers();
      expect(users.length).toBeGreaterThan(0);
      expect(users.some((u) => u.id === testUserId)).toBe(true);
    });

    it('should find user by id and update role/permissions', async () => {
      const found = await adminRepository.findUserById(testUserId);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(testUserId);

      const updated = await adminRepository.updateUserRoleAndPermissions(testUserId, {
        permissions: ['CATALOG_MANAGE'],
      });
      expect(updated.permissions).toContain('CATALOG_MANAGE');
    });
  });

  describe('AdminService DI', () => {
    it('should retrieve vendors using injected mock repository without type casting', async () => {
      const mockRepo = createMockAdminRepository({
        findAllVendors: async () => [createMockVendorProfile()],
      });

      const service = new AdminService({ adminRepo: mockRepo });
      const vendors = await service.getAllVendors();
      expect(vendors).toHaveLength(1);
      expect(vendors[0]?.shopName).toBe('Mock Electronics');
    });

    it('should throw NotFoundException when getting non-existent vendor by id', async () => {
      const mockRepo = createMockAdminRepository({
        findVendorById: async () => null,
      });

      const service = new AdminService({ adminRepo: mockRepo });
      await expect(service.getVendorById('missing-vendor-id')).rejects.toThrow(
        'Vendor profile not found',
      );
    });

    it('should create user through injected mock repository', async () => {
      const mockCreatedUser: AdminUserCreatedRecord = {
        id: 'created-user-id',
        name: 'Created Admin',
        email: 'created@example.com',
        role: 'ADMIN',
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRepo = createMockAdminRepository({
        createUser: async () => mockCreatedUser,
      });

      const service = new AdminService({ adminRepo: mockRepo });
      const result = await service.createUser({
        name: 'Created Admin',
        email: 'created@example.com',
        password: 'Password123!',
        role: 'ADMIN',
      });

      expect(result.id).toBe('created-user-id');
      expect(result.email).toBe('created@example.com');
    });
  });
});
