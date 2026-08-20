import {
  BrandFilterType,
  CreateBrandAuthorizationType,
  CreateBrandType,
  ReviewBrandAuthorizationType,
  UpdateBrandType,
} from '@celebs/shared-types';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@celebs/shared-utils';

import { BrandRepository, brandRepository as defaultBrandRepository } from './brand.repository';

export class BrandService {
  constructor(private brandRepository: BrandRepository = defaultBrandRepository) {}

  async getBrands(filters: BrandFilterType) {
    return this.brandRepository.findMany(filters);
  }

  async getBrandById(id: string) {
    const brand = await this.brandRepository.findById(id);
    if (!brand) {
      throw new NotFoundException(`Brand with ID '${id}' not found`);
    }
    return brand;
  }

  async getBrandBySlug(slug: string) {
    const brand = await this.brandRepository.findBySlug(slug);
    if (!brand) {
      throw new NotFoundException(`Brand with slug '${slug}' not found`);
    }
    return brand;
  }

  async getBrandByIdOrSlug(idOrSlug: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const brand = isUuid
      ? await this.brandRepository.findById(idOrSlug)
      : await this.brandRepository.findBySlug(idOrSlug);

    if (!brand) {
      throw new NotFoundException(`Brand '${idOrSlug}' not found`);
    }

    return brand;
  }

  async createBrand(input: CreateBrandType) {
    const slug = input.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existing = await this.brandRepository.findBySlug(slug);
    if (existing) {
      throw new BadRequestException(`A brand with name '${input.name}' already exists`);
    }

    return this.brandRepository.create({
      name: input.name.trim(),
      slug,
      logoUrl: input.logoUrl,
      bannerUrl: input.bannerUrl,
      description: input.description,
      story: input.story,
      countryOfOrigin: input.countryOfOrigin || 'Nepal',
      tier: input.tier,
      isGated: input.isGated,
    });
  }

  async updateBrand(id: string, input: UpdateBrandType) {
    const brand = await this.brandRepository.findById(id);
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    const data: Record<string, unknown> = { ...input };
    if (input.name && input.name.trim() !== brand.name) {
      data.name = input.name.trim();
      data.slug = input.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    return this.brandRepository.update(id, data);
  }

  // ── Seller Brand Authorization Requests (LOA) ──

  async submitAuthorization(vendorId: string, input: CreateBrandAuthorizationType) {
    const brand = await this.brandRepository.findById(input.brandId);
    if (!brand) {
      throw new NotFoundException('Selected brand does not exist');
    }

    if (brand.tier === 'FIRST_PARTY') {
      throw new ForbiddenException(
        'In-house private labels (Celebs Official, Celebs Denim) cannot be claimed by third-party sellers',
      );
    }

    if (!brand.isGated && brand.tier === 'OPEN_GENERIC') {
      throw new BadRequestException('This brand is generic and open; authorization is not required');
    }

    const expiryDate = input.documentExpiryDate ? new Date(input.documentExpiryDate) : null;

    return this.brandRepository.createAuthorization({
      vendorId,
      brandId: input.brandId,
      documentType: input.documentType,
      documentUrl: input.documentUrl,
      documentExpiryDate: expiryDate,
    });
  }

  async getVendorAuthorizations(vendorId: string) {
    return this.brandRepository.findVendorAuthorizations(vendorId);
  }

  async getPendingAuthorizations(page = 1, limit = 20) {
    return this.brandRepository.findPendingAuthorizations(page, limit);
  }

  async reviewAuthorization(id: string, adminUserId: string, input: ReviewBrandAuthorizationType) {
    return this.brandRepository.reviewAuthorization(id, {
      status: input.status,
      reviewedBy: adminUserId,
      reviewNotes: input.reviewNotes,
      rejectionReason: input.rejectionReason,
    });
  }

  // ── Brand Protection & Gating Guard ──

  async assertVendorCanUseBrand(params: {
    vendorId?: string | null;
    brandId?: string | null;
    userRole?: string;
  }): Promise<void> {
    const { vendorId, brandId, userRole } = params;

    // If no brand selected or generic, it's allowed
    if (!brandId) return;

    const brand = await this.brandRepository.findById(brandId);
    if (!brand) {
      throw new BadRequestException('Selected brand does not exist');
    }

    // 1. First Party Brands: Only Admins / Superadmins or Platform In-House can assign
    if (brand.tier === 'FIRST_PARTY') {
      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';
      if (!isAdmin) {
        throw new ForbiddenException(
          `'${brand.name}' is an in-house Celebs label and can only be published by platform administrators.`,
        );
      }
      return;
    }

    // 2. Open / Generic Brands: Free for all vendors
    if (!brand.isGated && brand.tier === 'OPEN_GENERIC') {
      return;
    }

    // 3. Gated / Registered Brands: Requires approved authorization
    if (!vendorId) {
      throw new ForbiddenException('Vendor context is required to use this brand');
    }

    const auth = await this.brandRepository.findAuthorization(vendorId, brandId);
    if (!auth || auth.status !== 'APPROVED') {
      throw new ForbiddenException(
        `You are not authorized to list products under '${brand.name}'. Please submit a Letter of Authorization (LOA) in Seller Center > Brand Authorizations.`,
      );
    }
  }

  async screenProductForBrandHijacking(params: {
    title: string;
    description?: string;
    vendorId?: string | null;
    selectedBrandId?: string | null;
  }): Promise<void> {
    const { title, description = '', vendorId, selectedBrandId } = params;
    const combinedText = `${title} ${description}`;

    const activeRules = await this.brandRepository.findActiveProtectionRules();
    if (!activeRules.length) return;

    for (const rule of activeRules) {
      // If the vendor is using this exact brand with approval, skip rule
      if (selectedBrandId === rule.brandId) continue;

      try {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(combinedText)) {
          // Check if vendor has authorization for this matched brand
          let isAuthorized = false;
          if (vendorId) {
            const auth = await this.brandRepository.findAuthorization(vendorId, rule.brandId);
            isAuthorized = auth?.status === 'APPROVED';
          }

          if (!isAuthorized) {
            throw new BadRequestException(
              `Product listing contains protected trademark term '${rule.brand.name}' without brand authorization. Please remove the trademarked keyword or apply for brand authorization.`,
            );
          }
        }
      } catch (e) {
        if (e instanceof BadRequestException) throw e;
      }
    }
  }
}

export const brandService = new BrandService();
