import prisma from '../../db/index.js';
import { CampaignType } from '../../generated/prisma/index.js';
import { CreateCampaignType } from '@celebs/shared-types';

export class CampaignService {
  async getActiveCampaigns() {
    const now = new Date();
    return prisma.campaign.findMany({
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
  }

  async getAllCampaigns() {
    return prisma.campaign.findMany({
      include: {
        products: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCampaignBySlug(slug: string) {
    return prisma.campaign.findUnique({
      where: { slug },
      include: {
        products: true,
      },
    });
  }

  async createCampaign(payload: CreateCampaignType) {
    const typeEnum = (payload.campaignType as CampaignType) || CampaignType.FESTIVAL;

    return prisma.campaign.create({
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
  }
}

export const campaignService = new CampaignService();
