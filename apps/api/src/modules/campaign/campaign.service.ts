import type { UpdateCampaignType } from '@celebs/shared-types';
import { createCampaignSchema } from '@celebs/shared-types';

import { type CampaignRepository, campaignRepository } from './campaign.repository';

import { TtlCache } from '@/common/utils/ttl-cache';

interface ProductItem {
  id: string;
  [key: string]: unknown;
}

// Public storefront reads — cached 60s L1 / 5min L2, busted on any mutation.
const activeCampaignsCache = new TtlCache<unknown[]>('campaigns:active');

export interface CampaignServiceDeps {
  campaignRepository?: Partial<CampaignRepository>;
}

export class CampaignService {
  private campaignRepository: CampaignRepository;

  constructor(deps: CampaignServiceDeps = {}) {
    this.campaignRepository = (deps.campaignRepository ?? campaignRepository) as CampaignRepository;
  }

  async getActiveCampaigns() {
    const now = new Date();
    // Bucket the fetch time so cache hits share one window; expiry filtering
    // stays correct within the bucket granularity.
    const bucket = Math.floor(now.getTime() / 60_000);
    const cached = await activeCampaignsCache.get(`t${bucket}`);
    if (cached) return cached;

    const campaigns = await this.campaignRepository.findActiveCampaigns(now);

    const allProductIds = Array.from(
      new Set(campaigns.flatMap((c) => (c.products || []).map((p) => p.productId))),
    );

    let result: unknown[];
    if (allProductIds.length === 0) {
      result = campaigns.map((c) => ({ ...c, productDetails: [] }));
    } else {
      const products = await this.campaignRepository.findProductsByIds(allProductIds);
      const productMap = new Map(products.map((p: ProductItem) => [p.id.toString(), p]));
      result = campaigns.map((c) => ({
        ...c,
        productDetails: (c.products || [])
          .map((p: { productId: string }) => productMap.get(p.productId))
          .filter(Boolean),
      }));
    }

    await activeCampaignsCache.set(`t${bucket}`, result);
    return result;
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

    const created = await this.campaignRepository.create({
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

    await activeCampaignsCache.invalidate();
    return created;
  }

  async updateCampaign(id: string, input: UpdateCampaignType) {
    const { productIds, startDate, endDate, ...campaignData } = input;

    const dataToUpdate: Record<string, unknown> = { ...campaignData };
    if (startDate) dataToUpdate.startDate = new Date(startDate);
    if (endDate) dataToUpdate.endDate = new Date(endDate);

    const updated = await this.campaignRepository.update(id, dataToUpdate, productIds);

    await activeCampaignsCache.invalidate();
    return updated;
  }
}

export const campaignService = new CampaignService();
