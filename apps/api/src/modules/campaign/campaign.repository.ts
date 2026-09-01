import prisma, { Prisma } from '@/config/db.prisma';

export class CampaignRepository {
  async findActiveCampaigns(now: Date) {
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

  async findAllCampaigns() {
    return prisma.campaign.findMany({
      include: {
        products: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBySlug(slug: string) {
    return prisma.campaign.findUnique({
      where: { slug },
      include: {
        products: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.campaign.findUnique({
      where: { id },
      include: {
        products: true,
      },
    });
  }

  async create(data: Prisma.CampaignCreateInput) {
    return prisma.campaign.create({
      data,
      include: {
        products: true,
      },
    });
  }

  async update(id: string, data: Prisma.CampaignUpdateInput, productIds?: string[]) {
    // Transactional: without it, a failed update after deleteMany would
    // permanently unlink all campaign products.
    return prisma.$transaction(async (tx) => {
      if (productIds) {
        await tx.campaignProduct.deleteMany({ where: { campaignId: id } });
      }

      return tx.campaign.update({
        where: { id },
        data,
        include: {
          products: true,
        },
      });
    });
  }

  async findProductsByIds(ids: string[]) {
    return prisma.product.findMany({ where: { id: { in: ids } } });
  }
}

export type ActiveCampaignsRecord = Prisma.PromiseReturnType<
  CampaignRepository['findActiveCampaigns']
>;
export type AllCampaignsRecord = Prisma.PromiseReturnType<CampaignRepository['findAllCampaigns']>;
export type CampaignRecord = Prisma.PromiseReturnType<CampaignRepository['findById']>;
export type CampaignCreatedRecord = Prisma.PromiseReturnType<CampaignRepository['create']>;
export type CampaignUpdatedRecord = Prisma.PromiseReturnType<CampaignRepository['update']>;
export type CampaignProductsRecord = Prisma.PromiseReturnType<
  CampaignRepository['findProductsByIds']
>;
export type CampaignProductItem = CampaignProductsRecord[number];

export interface ICampaignRepository {
  findActiveCampaigns(now: Date): Promise<ActiveCampaignsRecord>;
  findAllCampaigns(): Promise<AllCampaignsRecord>;
  findBySlug(slug: string): Promise<CampaignRecord>;
  findById(id: string): Promise<CampaignRecord>;
  create(data: Prisma.CampaignCreateInput): Promise<CampaignCreatedRecord>;
  update(
    id: string,
    data: Prisma.CampaignUpdateInput,
    productIds?: string[],
  ): Promise<CampaignUpdatedRecord>;
  findProductsByIds(ids: string[]): Promise<CampaignProductsRecord>;
}

export const campaignRepository: ICampaignRepository = new CampaignRepository();
