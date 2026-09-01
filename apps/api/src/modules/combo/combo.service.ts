import { ComboDiscountType } from '@prisma/client';

import { CreateComboType } from '@celebs/shared-types';

import { type ComboRepository, comboRepository } from './combo.repository';

import { TtlCache } from '@/common/utils/ttl-cache';

interface ComboItemInput {
  productId: string;
  [key: string]: unknown;
}

interface ComboInput {
  items?: ComboItemInput[];
  [key: string]: unknown;
}

// Public storefront reads — cached 60s L1 / 5min L2, busted on any mutation.
type HydratedCombo = Record<string, unknown>;
const activeCombosCache = new TtlCache<HydratedCombo[]>('combos:active');
const allCombosCache = new TtlCache<HydratedCombo[]>('combos:all');

export interface ComboServiceDeps {
  comboRepository?: Partial<ComboRepository>;
}

export class ComboService {
  private comboRepository: ComboRepository;

  constructor(deps: ComboServiceDeps = {}) {
    this.comboRepository = (deps.comboRepository ?? comboRepository) as ComboRepository;
  }

  private async attachProductDetails(combos: ComboInput[]) {
    const allProductIds = Array.from(
      new Set(
        combos.flatMap((c) => (c.items ? c.items.map((i: ComboItemInput) => i.productId) : [])),
      ),
    );

    const validProductIds = allProductIds.filter(
      (id) => typeof id === 'string' && id.trim().length > 0,
    );

    if (validProductIds.length === 0) {
      return combos.map((c) => ({ ...c, itemDetails: [] }));
    }

    const products = await this.comboRepository.findProductsByIds(validProductIds);
    const productMap = new Map(products.map((p: { id: string }) => [p.id.toString(), p]));

    return combos.map((c) => ({
      ...c,
      itemDetails: (c.items || []).map((item: ComboItemInput) => ({
        ...item,
        product: productMap.get(item.productId) || null,
      })),
    }));
  }

  async getActiveCombos(tag?: string) {
    const key = tag ?? 'all';
    const cached = await activeCombosCache.get(key);
    if (cached) return cached;

    const combos = await this.comboRepository.findActiveCombos(tag);
    const hydrated = await this.attachProductDetails(combos);
    await activeCombosCache.set(key, hydrated);
    return hydrated;
  }

  async getAllCombos() {
    const cached = await allCombosCache.get('all');
    if (cached) return cached;

    const combos = await this.comboRepository.findAllCombos();
    const hydrated = await this.attachProductDetails(combos);
    await allCombosCache.set('all', hydrated);
    return hydrated;
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

    await Promise.all([activeCombosCache.invalidate(), allCombosCache.invalidate()]);
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

    await Promise.all([activeCombosCache.invalidate(), allCombosCache.invalidate()]);
    const [hydrated] = await this.attachProductDetails([combo]);
    return hydrated;
  }

  async deleteCombo(id: string) {
    const deleted = await this.comboRepository.delete(id);
    await Promise.all([activeCombosCache.invalidate(), allCombosCache.invalidate()]);
    return deleted;
  }
}

export const comboService = new ComboService();
