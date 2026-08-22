import { Prisma } from '@prisma/client';

import prisma from '@/config/db.prisma';

export class MediaRepository {
  async findAssets(params: {
    vendorId?: string | null;
    folderId?: string | null;
    scope?: 'PRODUCT' | 'BRANDING' | 'KYC' | 'MARKETING';
    search?: string;
    unusedOnly?: boolean;
    mimeType?: string;
    page: number;
    limit: number;
  }) {
    const { vendorId, folderId, scope, search, unusedOnly, mimeType, page, limit } = params;
    const where: Prisma.MediaAssetWhereInput = {};

    if (vendorId !== undefined) {
      where.vendorId = vendorId;
    }
    if (folderId) {
      where.folderId = folderId;
    }
    if (scope) {
      where.scope = scope;
    }
    if (mimeType) {
      where.mimeType = { startsWith: mimeType };
    }
    if (unusedOnly) {
      where.usageCount = 0;
    }
    if (search) {
      where.originalName = { contains: search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      prisma.mediaAsset.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          folder: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.mediaAsset.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findAssetById(id: string, vendorId?: string | null) {
    const where: Prisma.MediaAssetWhereInput = { id };
    if (vendorId !== undefined) {
      where.vendorId = vendorId;
    }
    return prisma.mediaAsset.findFirst({
      where,
    });
  }

  async findAssetByKey(key: string) {
    return prisma.mediaAsset.findUnique({
      where: { key },
    });
  }

  async createAsset(data: {
    vendorId?: string | null;
    folderId?: string | null;
    originalName: string;
    key: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
    width?: number | null;
    height?: number | null;
    aspectRatio?: number | null;
    hashSha256?: string | null;
    scope?: 'PRODUCT' | 'BRANDING' | 'KYC' | 'MARKETING';
    isPrivate?: boolean;
  }) {
    return prisma.mediaAsset.upsert({
      where: { key: data.key },
      update: {
        folderId: data.folderId,
        sizeBytes: data.sizeBytes,
        mimeType: data.mimeType,
        width: data.width,
        height: data.height,
        aspectRatio: data.aspectRatio,
      },
      create: {
        vendorId: data.vendorId || null,
        folderId: data.folderId,
        originalName: data.originalName,
        key: data.key,
        url: data.url,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        width: data.width,
        height: data.height,
        aspectRatio: data.aspectRatio,
        hashSha256: data.hashSha256,
        scope: data.scope || 'PRODUCT',
        isPrivate: data.isPrivate || false,
      },
    });
  }

  async deleteAsset(id: string, vendorId?: string | null) {
    const where: Prisma.MediaAssetWhereInput = { id };
    if (vendorId !== undefined) {
      where.vendorId = vendorId;
    }
    return prisma.mediaAsset.deleteMany({
      where,
    });
  }

  /**
   * Scoped bulk fetch of unused assets by ID — unpaginated by design so
   * cleanup operations never orphan S3 objects beyond page 1.
   */
  async findUnusedByIds(assetIds: string[], vendorId?: string | null) {
    const where: Prisma.MediaAssetWhereInput = {
      id: { in: assetIds },
      usageCount: 0,
    };
    if (vendorId !== undefined) {
      where.vendorId = vendorId;
    }
    return prisma.mediaAsset.findMany({
      where,
      select: { id: true, key: true },
    });
  }

  async deleteUnusedAssets(assetIds: string[], vendorId?: string | null) {
    const where: Prisma.MediaAssetWhereInput = {
      id: { in: assetIds },
      usageCount: 0,
    };
    if (vendorId !== undefined) {
      where.vendorId = vendorId;
    }
    return prisma.mediaAsset.deleteMany({
      where,
    });
  }

  async incrementUsage(keys: string[]) {
    if (!keys.length) return;
    return prisma.mediaAsset.updateMany({
      where: { key: { in: keys } },
      data: {
        usageCount: { increment: 1 },
      },
    });
  }

  async decrementUsage(keys: string[]) {
    if (!keys.length) return;
    return prisma.mediaAsset.updateMany({
      where: { key: { in: keys } },
      data: {
        usageCount: { decrement: 1 },
      },
    });
  }

  async getQuota(vendorId?: string | null) {
    const whereCondition: Prisma.MediaAssetWhereInput =
      vendorId !== undefined ? { vendorId: vendorId ?? null } : {};
    const [aggregate, unlinkedAggregate] = await Promise.all([
      prisma.mediaAsset.aggregate({
        where: whereCondition,
        _sum: { sizeBytes: true },
        _count: { id: true },
      }),
      prisma.mediaAsset.aggregate({
        where: { ...whereCondition, usageCount: 0 },
        _sum: { sizeBytes: true },
        _count: { id: true },
      }),
    ]);

    const usedBytes = aggregate._sum?.sizeBytes || 0;
    // Platform: 100GB, Vendor Starter: 5GB
    const maxBytes = vendorId ? 5 * 1024 * 1024 * 1024 : 100 * 1024 * 1024 * 1024;
    const usedPercentage = Math.min(100, Math.round((usedBytes / maxBytes) * 100));

    return {
      vendorId: vendorId || 'PLATFORM',
      usedBytes,
      maxBytes,
      usedPercentage,
      tier: vendorId ? ('STARTER' as const) : ('ENTERPRISE' as const),
      totalAssetCount: aggregate._count?.id || 0,
      unlinkedAssetCount: unlinkedAggregate._count?.id || 0,
      unlinkedSizeBytes: unlinkedAggregate._sum?.sizeBytes || 0,
    };
  }

  // ── Folders ──

  static readonly DEFAULT_VENDOR_FOLDERS = ['Products', 'Banners', 'Marketing', 'Documents'];

  async ensureDefaultFolders(vendorId?: string | null) {
    try {
      const existing = await prisma.mediaFolder.findMany({
        where: { vendorId: vendorId ?? null, parentId: null },
        select: { name: true },
      });
      const existingNames = new Set(existing.map((f) => f.name));
      const toCreate = MediaRepository.DEFAULT_VENDOR_FOLDERS.filter(
        (name) => !existingNames.has(name),
      );

      if (toCreate.length > 0) {
        await prisma.mediaFolder.createMany({
          data: toCreate.map((name) => ({
            vendorId: vendorId ?? null,
            name,
            parentId: null,
          })),
          skipDuplicates: true,
        });
      }
    } catch {
      // Gracefully handle if folder race condition occurs
    }
  }

  async findFolders(vendorId?: string | null) {
    const existing = await prisma.mediaFolder.findMany({
      where: { vendorId: vendorId ?? null },
      include: {
        _count: {
          select: { assets: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (existing.length === 0) {
      await this.ensureDefaultFolders(vendorId);
      return prisma.mediaFolder.findMany({
        where: { vendorId: vendorId ?? null },
        include: {
          _count: {
            select: { assets: true },
          },
        },
        orderBy: { name: 'asc' },
      });
    }

    return existing;
  }

  async createFolder(vendorId: string | null | undefined, name: string, parentId?: string | null) {
    return prisma.mediaFolder.create({
      data: {
        vendorId: vendorId ?? null,
        name,
        parentId: parentId || null,
      },
    });
  }

  async updateFolder(id: string, vendorId: string | null | undefined, name: string) {
    const where: Prisma.MediaFolderWhereInput = { id };
    if (vendorId !== undefined) {
      where.vendorId = vendorId;
    }
    return prisma.mediaFolder.updateMany({
      where,
      data: { name },
    });
  }

  async deleteFolder(id: string, vendorId?: string | null) {
    const where: Prisma.MediaFolderWhereInput = { id };
    if (vendorId !== undefined) {
      where.vendorId = vendorId;
    }
    return prisma.mediaFolder.deleteMany({
      where,
    });
  }
}

export const mediaRepository = new MediaRepository();
