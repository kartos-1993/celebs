import { type Brand as PrismaBrand, Prisma } from '@prisma/client';
import type {
  Brand,
  BrandSummary,
  BrandTier,
  VendorBrandAuthorization,
} from '@celebs/shared-types';
import prisma from '@/config/db.prisma';

export class BrandRepository {
  constructor(private db = prisma) {}

  private toEntity(row: (PrismaBrand & { _count?: { products: number } }) | null): Brand | null {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      logoUrl: row.logoUrl,
      bannerUrl: row.bannerUrl,
      description: row.description,
      story: row.story,
      countryOfOrigin: row.countryOfOrigin,
      tier: row.tier as BrandTier,
      isGated: row.isGated,
      ownerVendorId: row.ownerVendorId,
      productCount: row._count?.products ?? 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findById(id: string): Promise<Brand | null> {
    if (!id || typeof id !== 'string') return null;
    const brand = await this.db.brand.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
      },
    });
    return this.toEntity(brand);
  }

  async findBySlug(slug: string): Promise<Brand | null> {
    if (!slug || typeof slug !== 'string') return null;
    const brand = await this.db.brand.findUnique({
      where: { slug },
      include: {
        _count: { select: { products: true } },
      },
    });
    return this.toEntity(brand);
  }

  async findByName(name: string): Promise<Brand | null> {
    if (!name || typeof name !== 'string') return null;
    const brand = await this.db.brand.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' } },
      include: {
        _count: { select: { products: true } },
      },
    });
    return this.toEntity(brand);
  }

  async findMany(params: {
    search?: string;
    tier?: BrandTier;
    isGated?: boolean;
    page: number;
    limit: number;
  }): Promise<{ items: Brand[]; total: number; page: number; limit: number; pages: number }> {
    const { search, tier, isGated, page, limit } = params;
    const where: Prisma.BrandWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (tier) {
      where.tier = tier;
    }
    if (typeof isGated === 'boolean') {
      where.isGated = isGated;
    }

    const [rows, total] = await Promise.all([
      this.db.brand.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ tier: 'asc' }, { name: 'asc' }],
        include: {
          _count: { select: { products: true } },
        },
      }),
      this.db.brand.count({ where }),
    ]);

    const items = rows.map((r) => this.toEntity(r)).filter((b): b is Brand => b !== null);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async create(data: Prisma.BrandCreateInput): Promise<Brand> {
    const brand = await this.db.brand.create({
      data,
      include: {
        _count: { select: { products: true } },
      },
    });
    return this.toEntity(brand)!;
  }

  async update(id: string, data: Prisma.BrandUpdateInput): Promise<Brand> {
    const brand = await this.db.brand.update({
      where: { id },
      data,
      include: {
        _count: { select: { products: true } },
      },
    });
    return this.toEntity(brand)!;
  }

  // ── Brand Authorization Data Operations ──

  async findAuthorization(vendorId: string, brandId: string) {
    return this.db.vendorBrandAuthorization.findUnique({
      where: {
        vendorId_brandId: { vendorId, brandId },
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            tier: true,
            isGated: true,
          },
        },
      },
    });
  }

  async findVendorAuthorizations(vendorId: string) {
    return this.db.vendorBrandAuthorization.findMany({
      where: { vendorId },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            tier: true,
            isGated: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingAuthorizations(page = 1, limit = 20) {
    const where: Prisma.VendorBrandAuthorizationWhereInput = {
      status: 'PENDING',
    };

    const [items, total] = await Promise.all([
      this.db.vendorBrandAuthorization.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          brand: true,
          vendor: {
            select: {
              id: true,
              shopName: true,
              businessName: true,
              phoneNumber: true,
              panNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.db.vendorBrandAuthorization.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async createAuthorization(data: {
    vendorId: string;
    brandId: string;
    documentType: string;
    documentUrl: string;
    documentExpiryDate?: Date | null;
  }) {
    return this.db.vendorBrandAuthorization.upsert({
      where: {
        vendorId_brandId: {
          vendorId: data.vendorId,
          brandId: data.brandId,
        },
      },
      update: {
        documentType: data.documentType,
        documentUrl: data.documentUrl,
        documentExpiryDate: data.documentExpiryDate,
        status: 'PENDING',
        rejectionReason: null,
        reviewNotes: null,
      },
      create: {
        vendorId: data.vendorId,
        brandId: data.brandId,
        documentType: data.documentType,
        documentUrl: data.documentUrl,
        documentExpiryDate: data.documentExpiryDate,
        status: 'PENDING',
      },
      include: {
        brand: true,
      },
    });
  }

  async reviewAuthorization(
    id: string,
    data: {
      status: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW' | 'REVOKED';
      reviewedBy: string;
      reviewNotes?: string;
      rejectionReason?: string;
    },
  ) {
    return this.db.vendorBrandAuthorization.update({
      where: { id },
      data: {
        status: data.status,
        reviewedBy: data.reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: data.reviewNotes,
        rejectionReason: data.rejectionReason,
      },
      include: {
        brand: true,
      },
    });
  }

  async findActiveProtectionRules() {
    return this.db.brandProtectionRule.findMany({
      where: { isActive: true },
      include: {
        brand: {
          select: { id: true, name: true, tier: true },
        },
      },
    });
  }
}

export const brandRepository = new BrandRepository();
