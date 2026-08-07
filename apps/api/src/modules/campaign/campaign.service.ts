import mongoose from 'mongoose';
import prisma from '../../db/index';
import { CampaignType } from '@prisma/client';
import { CreateCampaignType } from '@celebs/shared-types';
import { ProductModel } from '../../db/models/product.model';

export class CampaignService {
  private async attachProductDetails(campaigns: any[]) {
    const allProductIds = Array.from(
      new Set(
        campaigns.flatMap((c) => (c.products ? c.products.map((p: any) => p.productId) : []))
      )
    );

    const validProductIds = allProductIds.filter(
      (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
    );

    if (validProductIds.length === 0) {
      return campaigns.map((c) => ({ ...c, productDetails: [] }));
    }

    const mongoProducts = await ProductModel.find({ _id: { $in: validProductIds } }).lean();
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
    const campaigns = await prisma.campaign.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        products: true,
      },
      orderBy: { endDate: 'asc' },
    });

    return this.attachProductDetails(campaigns);
  }

  async getAllCampaigns() {
    const campaigns = await prisma.campaign.findMany({
      include: {
        products: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.attachProductDetails(campaigns);
  }

  async getCampaignBySlug(slug: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { slug },
      include: {
        products: true,
      },
    });

    if (!campaign) return null;
    const [hydrated] = await this.attachProductDetails([campaign]);
    return hydrated;
  }

  async getCampaignById(id: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        products: true,
      },
    });

    if (!campaign) return null;
    const [hydrated] = await this.attachProductDetails([campaign]);
    return hydrated;
  }

  async createCampaign(payload: CreateCampaignType) {
    const typeEnum = (payload.campaignType as CampaignType) || CampaignType.FESTIVAL;

    const campaign = await prisma.campaign.create({
      data: {
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
      },
      include: {
        products: true,
      },
    });

    const [hydrated] = await this.attachProductDetails([campaign]);
    return hydrated;
  }

  async updateCampaign(id: string, payload: Partial<CreateCampaignType>) {
    const typeEnum = payload.campaignType ? (payload.campaignType as CampaignType) : undefined;

    if (payload.productIds) {
      await prisma.campaignProduct.deleteMany({ where: { campaignId: id } });
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
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
      include: {
        products: true,
      },
    });

    const [hydrated] = await this.attachProductDetails([campaign]);
    return hydrated;
  }
}

export const campaignService = new CampaignService();
