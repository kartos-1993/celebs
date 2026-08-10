import mongoose from 'mongoose';
import { CampaignType } from '@prisma/client';
import { CreateCampaignType } from '@celebs/shared-types';
import { campaignRepository, CampaignRepository } from './campaign.repository';

export class CampaignService {
  private campaignRepository: CampaignRepository;

  constructor(repository: CampaignRepository = campaignRepository) {
    this.campaignRepository = repository;
  }

  private async attachProductDetails(campaigns: any[]) {
    const allProductIds = Array.from(
      new Set(
        campaigns.flatMap((c) => (c.products ? c.products.map((p: any) => p.productId) : [])),
      ),
    );

    const validProductIds = allProductIds.filter(
      (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id),
    );

    if (validProductIds.length === 0) {
      return campaigns.map((c) => ({ ...c, productDetails: [] }));
    }

    const mongoProducts = await this.campaignRepository.findMongoProductsByIds(validProductIds);
    const productMap = new Map(mongoProducts.map((p) => [p._id.toString(), p]));

    return campaigns.map((c) => ({
      ...c,
      productDetails: (c.products || [])
        .map((p: any) => productMap.get(p.productId))
        .filter(Boolean),
    }));
  }

  async getActiveCampaigns() {
    const now = new Date();
    const campaigns = await this.campaignRepository.findActiveCampaigns(now);
    return this.attachProductDetails(campaigns);
  }

  async getAllCampaigns() {
    const campaigns = await this.campaignRepository.findAllCampaigns();
    return this.attachProductDetails(campaigns);
  }

  async getCampaignBySlug(slug: string) {
    const campaign = await this.campaignRepository.findBySlug(slug);
    if (!campaign) return null;
    const [hydrated] = await this.attachProductDetails([campaign]);
    return hydrated;
  }

  async getCampaignById(id: string) {
    const campaign = await this.campaignRepository.findById(id);
    if (!campaign) return null;
    const [hydrated] = await this.attachProductDetails([campaign]);
    return hydrated;
  }

  async createCampaign(payload: CreateCampaignType) {
    const typeEnum = (payload.campaignType as CampaignType) || CampaignType.FESTIVAL;

    const campaign = await this.campaignRepository.create({
      title: payload.title,
      slug: payload.slug,
      campaignType: typeEnum,
      tagline: payload.tagline,
      bannerImage: payload.bannerImage,
      themeColor: payload.themeColor ?? '#D92525',
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
      products: payload.productIds
        ? {
            create: payload.productIds.map((productId) => ({
              productId,
            })),
          }
        : undefined,
    });

    const [hydrated] = await this.attachProductDetails([campaign]);
    return hydrated;
  }

  async updateCampaign(id: string, payload: Partial<CreateCampaignType>) {
    const typeEnum = payload.campaignType ? (payload.campaignType as CampaignType) : undefined;

    const campaign = await this.campaignRepository.update(
      id,
      {
        title: payload.title,
        slug: payload.slug,
        campaignType: typeEnum,
        tagline: payload.tagline,
        bannerImage: payload.bannerImage,
        themeColor: payload.themeColor,
        startDate: payload.startDate ? new Date(payload.startDate) : undefined,
        endDate: payload.endDate ? new Date(payload.endDate) : undefined,
        products: payload.productIds
          ? {
              create: payload.productIds.map((productId) => ({
                productId,
              })),
            }
          : undefined,
      },
      payload.productIds,
    );

    const [hydrated] = await this.attachProductDetails([campaign]);
    return hydrated;
  }
}

export const campaignService = new CampaignService();
