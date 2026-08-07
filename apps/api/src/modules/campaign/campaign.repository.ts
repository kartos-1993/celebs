import prisma, { Prisma } from '@/config/db.prisma';
import { ProductModel } from '@/db/models/product.model';

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
    if (productIds) {
      await prisma.campaignProduct.deleteMany({ where: { campaignId: id } });
    }

    return prisma.campaign.update({
      where: { id },
      data,
      include: {
        products: true,
      },
    });
  }

  async findMongoProductsByIds(ids: string[]) {
    return ProductModel.find({ _id: { $in: ids } }).lean();
  }
}

export const campaignRepository = new CampaignRepository();
