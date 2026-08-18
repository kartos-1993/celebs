import { Prisma } from '@prisma/client';
import prisma from '@/config/db.prisma';

export class MediaRepository {
  async findAssets(params: {
    vendorId: string;
    folderId?: string | null;
    scope?: 'PRODUCT' | 'BRANDING' | 'KYC' | 'MARKETING';
    search?: string;
    unusedOnly?: boolean;
    mimeType?: string;
    page: number;
    limit: number;
  }) {
    const { vendorId, folderId, scope, search, unusedOnly, mimeType, page, limit } = params;
    const where: Prisma.MediaAssetWhereInput = { vendorId };

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

  async findAssetById(id: string, vendorId: string) {
    return prisma.mediaAsset.findFirst({
      where: { id, vendorId },
    });
  }

  async findAssetByKey(key: string) {
    return prisma.mediaAsset.findUnique({
      where: { key },
    });
  }

  async createAsset(data: {
    vendorId: string;
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
        vendorId: data.vendorId,
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

  async deleteAsset(id: string, vendorId: string) {
    return prisma.mediaAsset.deleteMany({
      where: { id, vendorId },
    });
  }

  async deleteUnusedAssets(assetIds: string[], vendorId: string) {
    return prisma.mediaAsset.deleteMany({
      where: {
        id: { in: assetIds },
        vendorId,
        usageCount: 0,
      },
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

  async getQuota(vendorId: string) {
    const [aggregate, unlinkedAggregate] = await Promise.all([
      prisma.mediaAsset.aggregate({
        where: { vendorId },
        _sum: { sizeBytes: true },
        _count: { id: true },
      }),
      prisma.mediaAsset.aggregate({
        where: { vendorId, usageCount: 0 },
        _sum: { sizeBytes: true },
        _count: { id: true },
      }),
    ]);

    const usedBytes = aggregate._sum.sizeBytes || 0;
    // Default Starter: 5GB (5 * 1024 * 1024 * 1024 bytes)
    const maxBytes = 5 * 1024 * 1024 * 1024;
    const usedPercentage = Math.min(100, Math.round((usedBytes / maxBytes) * 100));

    return {
      vendorId,
      usedBytes,
      maxBytes,
      usedPercentage,
      tier: 'STARTER' as const,
      totalAssetCount: aggregate._count.id || 0,
      unlinkedAssetCount: unlinkedAggregate._count.id || 0,
      unlinkedSizeBytes: unlinkedAggregate._sum.sizeBytes || 0,
    };
  }

  // ── Folders ──

  async findFolders(vendorId: string) {
    return prisma.mediaFolder.findMany({
      where: { vendorId },
      include: {
        _count: {
          select: { assets: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createFolder(vendorId: string, name: string, parentId?: string | null) {
    return prisma.mediaFolder.create({
      data: {
        vendorId,
        name,
        parentId: parentId || null,
      },
    });
  }

  async updateFolder(id: string, vendorId: string, name: string) {
    return prisma.mediaFolder.updateMany({
      where: { id, vendorId },
      data: { name },
    });
  }

  async deleteFolder(id: string, vendorId: string) {
    return prisma.mediaFolder.deleteMany({
      where: { id, vendorId },
    });
  }
}

export const mediaRepository = new MediaRepository();
