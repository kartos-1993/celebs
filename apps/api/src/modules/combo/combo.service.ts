import { ComboDiscountType } from '@prisma/client';
import { CreateComboType } from '@celebs/shared-types';
import { comboRepository, ComboRepository } from './combo.repository';

export class ComboService {
  private comboRepository: ComboRepository;

  constructor(repository: ComboRepository = comboRepository) {
    this.comboRepository = repository;
  }

  private async attachProductDetails(combos: any[]) {
    const allProductIds = Array.from(
      new Set(combos.flatMap((c) => (c.items ? c.items.map((i: any) => i.productId) : []))),
    );

    const validProductIds = allProductIds.filter(
      (id) => typeof id === 'string' && id.trim().length > 0,
    );

    if (validProductIds.length === 0) {
      return combos.map((c) => ({ ...c, itemDetails: [] }));
    }

    const products = await this.comboRepository.findProductsByIds(validProductIds);
    const productMap = new Map(products.map((p: any) => [p.id.toString(), p]));

    return combos.map((c) => ({
      ...c,
      itemDetails: (c.items || []).map((item: any) => ({
        ...item,
        product: productMap.get(item.productId) || null,
      })),
    }));
  }

  async getActiveCombos(tag?: string) {
    const combos = await this.comboRepository.findActiveCombos(tag);
    return this.attachProductDetails(combos);
  }

  async getAllCombos() {
    const combos = await this.comboRepository.findAllCombos();
    return this.attachProductDetails(combos);
  }

  async getComboBySlug(slug: string) {
    const combo = await this.comboRepository.findBySlug(slug);
    if (!combo) return null;
    const [hydrated] = await this.attachProductDetails([combo]);
    return hydrated;
  }

  async getComboById(id: string) {
    const combo = await this.comboRepository.findById(id);
    if (!combo) return null;
    const [hydrated] = await this.attachProductDetails([combo]);
    return hydrated;
  }

  async createCombo(payload: CreateComboType) {
    const discountTypeEnum =
      payload.discountType === 'FIXED_AMOUNT'
        ? ComboDiscountType.FIXED_AMOUNT
        : ComboDiscountType.PERCENTAGE;

    const combo = await this.comboRepository.create({
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
    });

    const [hydrated] = await this.attachProductDetails([combo]);
    return hydrated;
  }

  async updateCombo(id: string, payload: Partial<CreateComboType>) {
    const discountTypeEnum = payload.discountType
      ? payload.discountType === 'FIXED_AMOUNT'
        ? ComboDiscountType.FIXED_AMOUNT
        : ComboDiscountType.PERCENTAGE
      : undefined;

    const combo = await this.comboRepository.update(
      id,
      {
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
      payload.productIds,
    );

    const [hydrated] = await this.attachProductDetails([combo]);
    return hydrated;
  }

  async deleteCombo(id: string) {
    return this.comboRepository.delete(id);
  }
}

export const comboService = new ComboService();
