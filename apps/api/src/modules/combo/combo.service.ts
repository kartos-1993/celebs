import mongoose from 'mongoose';
import prisma from '../../db/index';
import { ComboDiscountType } from '@prisma/client';
import { CreateComboType } from '@celebs/shared-types';
import { ProductModel } from '../../db/models/product.model';

export class ComboService {
  private async attachProductDetails(combos: any[]) {
    const allProductIds = Array.from(
      new Set(
        combos.flatMap((c) => (c.items ? c.items.map((i: any) => i.productId) : []))
      )
    );

    const validProductIds = allProductIds.filter(
      (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
    );

    if (validProductIds.length === 0) {
      return combos.map((c) => ({ ...c, itemDetails: [] }));
    }

    const mongoProducts = await ProductModel.find({ _id: { $in: validProductIds } }).lean();
    const productMap = new Map(mongoProducts.map((p) => [p._id.toString(), p]));

    return combos.map((c) => ({
      ...c,
      itemDetails: (c.items || []).map((item: any) => ({
        ...item,
        product: productMap.get(item.productId) || null,
      })),
    }));
  }

  async getActiveCombos(tag?: string) {
    const where: any = { isActive: true };
    if (tag) where.tag = tag;

    const combos = await prisma.comboBundle.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.attachProductDetails(combos);
  }

  async getAllCombos() {
    const combos = await prisma.comboBundle.findMany({
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.attachProductDetails(combos);
  }

  async getComboBySlug(slug: string) {
    const combo = await prisma.comboBundle.findUnique({
      where: { slug },
      include: {
        items: true,
      },
    });

    if (!combo) return null;
    const [hydrated] = await this.attachProductDetails([combo]);
    return hydrated;
  }

  async getComboById(id: string) {
    const combo = await prisma.comboBundle.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!combo) return null;
    const [hydrated] = await this.attachProductDetails([combo]);
    return hydrated;
  }

  async createCombo(payload: CreateComboType) {
    const discountTypeEnum =
      payload.discountType === 'FIXED_AMOUNT'
        ? ComboDiscountType.FIXED_AMOUNT
        : ComboDiscountType.PERCENTAGE;

    const combo = await prisma.comboBundle.create({
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

    const [hydrated] = await this.attachProductDetails([combo]);
    return hydrated;
  }

  async updateCombo(id: string, payload: Partial<CreateComboType>) {
    if (payload.productIds) {
      await prisma.comboBundleItem.deleteMany({ where: { bundleId: id } });
    }

    const discountTypeEnum = payload.discountType
      ? payload.discountType === 'FIXED_AMOUNT'
        ? ComboDiscountType.FIXED_AMOUNT
        : ComboDiscountType.PERCENTAGE
      : undefined;

    const combo = await prisma.comboBundle.update({
      where: { id },
      data: {
        title: payload.title,
        slug: payload.slug,
        subtitle: payload.subtitle,
        description: payload.description,
        bannerImage: payload.bannerImage,
        discountType: discountTypeEnum,
        discountValue: payload.discountValue,
        tag: payload.tag,
        items: payload.productIds
          ? {
              create: payload.productIds.map((productId) => ({
                productId,
              })),
            }
          : undefined,
      },
      include: {
        items: true,
      },
    });

    const [hydrated] = await this.attachProductDetails([combo]);
    return hydrated;
  }

  async deleteCombo(id: string) {
    return prisma.comboBundle.delete({
      where: { id },
    });
  }
}

export const comboService = new ComboService();
