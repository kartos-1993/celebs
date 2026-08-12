import { createCampaignSchema } from '@celebs/shared-types';

import { CampaignRepository } from './campaign.repository';

interface ProductItem {
  id: string;
  [key: string]: unknown;
}

interface CampaignProductInput {
  productId: string;
  discountType?: string;
  discountValue?: number;
}

export class CampaignService {
  constructor(private campaignRepository: CampaignRepository = new CampaignRepository()) {}

  async getActiveCampaigns() {
    const now = new Date();
    const campaigns = await this.campaignRepository.findActiveCampaigns(now);

    const allProductIds = Array.from(
      new Set(campaigns.flatMap((c) => (c.products || []).map((p) => p.productId))),
    );

    if (allProductIds.length === 0) {
      return campaigns.map((c) => ({ ...c, productDetails: [] }));
    }

    const products = await this.campaignRepository.findProductsByIds(allProductIds);
    const productMap = new Map(products.map((p: ProductItem) => [p.id.toString(), p]));

    return campaigns.map((c) => ({
      ...c,
      productDetails: (c.products || [])
        .map((p: { productId: string }) => productMap.get(p.productId))
        .filter(Boolean),
    }));
  }

  async getAllCampaigns() {
    return this.campaignRepository.findAllCampaigns();
  }

  async getCampaignBySlug(slug: string) {
    const campaign = await this.campaignRepository.findBySlug(slug);
    if (!campaign) return null;

    const productIds = (campaign.products || []).map((p) => p.productId);
    const products = await this.campaignRepository.findProductsByIds(productIds);
    const productMap = new Map(products.map((p: ProductItem) => [p.id.toString(), p]));

    return {
      ...campaign,
      productDetails: (campaign.products || [])
        .map((p: { productId: string }) => productMap.get(p.productId))
        .filter(Boolean),
    };
  }

  async getCampaignById(id: string) {
    return this.campaignRepository.findById(id);
  }

  async createCampaign(input: unknown) {
    const validated = createCampaignSchema.parse(input);
    const { productIds, ...campaignData } = validated;

    return this.campaignRepository.create({
      ...campaignData,
      startDate: new Date(campaignData.startDate),
      endDate: new Date(campaignData.endDate),
      products: productIds
        ? {
            create: productIds.map((pId: string) => ({
              productId: pId,
              discountType: 'PERCENTAGE',
              discountValue: 10,
            })),
          }
        : undefined,
    });
  }

  async updateCampaign(id: string, input: Record<string, unknown> & { products?: CampaignProductInput[]; startDate?: string; endDate?: string }) {
    const { products, ...campaignData } = input;

    const dataToUpdate: Record<string, unknown> = { ...campaignData };
    if (campaignData.startDate) dataToUpdate.startDate = new Date(campaignData.startDate);
    if (campaignData.endDate) dataToUpdate.endDate = new Date(campaignData.endDate);

    if (products && Array.isArray(products)) {
      dataToUpdate.products = {
        create: products.map((p: CampaignProductInput) => ({
          productId: p.productId,
          discountType: p.discountType,
          discountValue: p.discountValue,
        })),
      };
    }

    return this.campaignRepository.update(
      id,
      dataToUpdate,
      products ? products.map((p: CampaignProductInput) => p.productId) : undefined,
    );
  }
}
