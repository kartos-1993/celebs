import prisma from '../../db/index.js';
import { ComboDiscountType } from '../../generated/prisma/index.js';
import { CreateComboType } from '@celebs/shared-types';

export class ComboService {
  async getActiveCombos(tag?: string) {
    const where: any = { isActive: true };
    if (tag) where.tag = tag;

    return prisma.comboBundle.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getComboBySlug(slug: string) {
    return prisma.comboBundle.findUnique({
      where: { slug },
      include: {
        items: true,
      },
    });
  }

  async createCombo(payload: CreateComboType) {
    const discountTypeEnum = payload.discountType === 'FIXED_AMOUNT' ? ComboDiscountType.FIXED_AMOUNT : ComboDiscountType.PERCENTAGE;

    return prisma.comboBundle.create({
      data: {
        title: payload.title,
        slug: payload.slug,
        subtitle: payload.subtitle,
        description: payload.description,
        bannerImage: payload.bannerImage,
        discountType: discountTypeEnum,
        discountValue: payload.discountValue,
        isFirstParty: payload.isFirstParty ?? true,
        tag: payload.tag,
        items: {
          create: payload.productIds.map((productId) => ({
            productId,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }

  async deleteCombo(id: string) {
    return prisma.comboBundle.delete({
      where: { id },
    });
  }
}

export const comboService = new ComboService();
