import { beforeEach, describe, expect, it } from 'vitest';

import prisma from '@/config/db.prisma';
import { CategoryService } from '@/modules/category/category.service';

describe('Category Recent Usage Tracking (PostgreSQL Database)', () => {
  let categoryService: CategoryService;
  let mockUserId: string;
  let mockVendorId: string;
  let cat1: { id: string; name: string };
  let cat2: { id: string; name: string };

  beforeEach(async () => {
    categoryService = new CategoryService();
    const uid = Math.random().toString(36).substring(2, 8);

    const user = await prisma.user.create({
      data: {
        name: 'Recent Category User',
        email: `recent-cat-${Date.now()}-${uid}@example.com`,
        password: 'hashedpassword',
        role: 'VENDOR',
      },
    });
    mockUserId = user.id;

    const vendor = await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        shopName: `Recent Shop ${Date.now()}-${uid}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
        panNumber: `PAN-RC-${Date.now()}-${uid}`,
        citizenshipNumber: `CIT-RC-${Date.now()}-${uid}`,
      },
    });
    mockVendorId = vendor.id;

    cat1 = await prisma.category.create({
      data: {
        name: `Women Apparel ${uid}`,
        slug: `women-apparel-${uid}`,
        level: 1,
        path: `women-apparel-${uid}`,
      },
    });

    cat2 = await prisma.category.create({
      data: {
        name: `Maxi Dresses ${uid}`,
        slug: `maxi-dresses-${uid}`,
        level: 2,
        parentCategory: cat1.id,
        path: `women-apparel-${uid}/maxi-dresses-${uid}`,
      },
    });
  });

  it('should record recently used category into PostgreSQL database and retrieve it', async () => {
    // Initially empty
    const initial = await categoryService.getRecentCategories(mockUserId, mockVendorId);
    expect(initial).toEqual([]);

    // Record cat1
    const after1 = await categoryService.recordRecentCategory(mockUserId, cat1.id, mockVendorId);
    expect(after1).toHaveLength(1);
    expect(after1[0]?.id).toBe(cat1.id);
    expect(after1[0]?.name).toBe(cat1.name);

    // Record cat2
    const after2 = await categoryService.recordRecentCategory(mockUserId, cat2.id, mockVendorId);
    expect(after2).toHaveLength(2);
    expect(after2[0]?.id).toBe(cat2.id); // Latest is first
    expect(after2[1]?.id).toBe(cat1.id);

    // Verify persisted directly in PostgreSQL and shared with vendor staff members
    const persisted = await categoryService.getRecentCategories(mockUserId, mockVendorId);
    expect(persisted).toHaveLength(2);
    expect(persisted[0]?.id).toBe(cat2.id);

    // Another staff user under same vendor store gets the exact same recent categories
    const staffUserId = `staff-${Date.now()}`;
    const staffRecent = await categoryService.getRecentCategories(staffUserId, mockVendorId);
    expect(staffRecent).toHaveLength(2);
    expect(staffRecent[0]?.id).toBe(cat2.id);
  });

  it('should cap recent categories to a maximum of 5 and automatically evict older items (LRU)', async () => {
    const categories: { id: string; name: string }[] = [];
    for (let i = 1; i <= 7; i++) {
      const cat = await prisma.category.create({
        data: {
          name: `Category ${i} - ${Date.now()}-${i}`,
          slug: `category-${i}-${Date.now()}-${i}`,
          level: 1,
          path: `category-${i}`,
        },
      });
      categories.push(cat);
    }

    // Record 7 categories sequentially
    for (const cat of categories) {
      await categoryService.recordRecentCategory(mockUserId, cat.id, mockVendorId);
    }

    const recent = await categoryService.getRecentCategories(mockUserId, mockVendorId);
    // Should be capped at exactly 5
    expect(recent).toHaveLength(5);
    // Most recently added should be first (Category 7)
    expect(recent[0]?.id).toBe(categories[6]?.id);
    // Oldest categories (1 and 2) should be evicted
    expect(recent.some((c) => c.id === categories[0]?.id)).toBe(false);
    expect(recent.some((c) => c.id === categories[1]?.id)).toBe(false);
  });
});
