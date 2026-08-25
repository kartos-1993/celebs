import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { wishlistRepository } from './wishlist.repository';

import prisma from '@/config/db.prisma';

export interface WishlistProductSummary {
  id: string;
  name: string;
  brand?: string;
  slug: string;
  price: number;
  discountedPrice?: number;
  mainImages: string[];
  status: string;
}

export interface WishlistEntry {
  id: string;
  productId: string;
  addedAt: string;
  product: WishlistProductSummary;
}

type WishlistProductWithRelations = {
  id: string;
  name: string;
  brand: string | null;
  slug: string;
  price: PrismaDecimalLike;
  discountedPrice: PrismaDecimalLike | null;
  mainImages: string[];
  status: string;
};

interface PrismaDecimalLike {
  toNumber(): number;
}

export class WishlistService {
  private static toSummary(product: WishlistProductWithRelations): WishlistProductSummary {
    const rawPrice = product.price.toNumber();
    const rawDiscounted = product.discountedPrice ? product.discountedPrice.toNumber() : undefined;

    return {
      id: product.id,
      name: product.name,
      ...(product.brand ? { brand: product.brand } : {}),
      slug: product.slug,
      price: rawPrice,
      ...(rawDiscounted && rawDiscounted > 0 && rawDiscounted < rawPrice
        ? { discountedPrice: rawDiscounted }
        : {}),
      mainImages: product.mainImages,
      status: product.status,
    };
  }

  static async getWishlist(userId: string): Promise<WishlistEntry[]> {
    const items = await wishlistRepository.findManyByUser(userId);

    return items.map((item) => ({
      id: item.id,
      productId: item.productId,
      addedAt: item.createdAt.toISOString(),
      product: this.toSummary(item.product),
    }));
  }

  static async addToWishlist(userId: string, productId: string): Promise<WishlistEntry> {
    const existing = await wishlistRepository.findByUserAndProduct(userId, productId);
    if (existing) {
      // Idempotent re-add — refresh the hydrated entry
      const items = await wishlistRepository.findManyByUser(userId);
      const entry = items.find((i) => i.productId === productId);
      if (entry) {
        return {
          id: entry.id,
          productId: entry.productId,
          addedAt: entry.createdAt.toISOString(),
          product: this.toSummary(entry.product),
        };
      }
    }

    // Validate product exists before creating the relation
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    const created = await wishlistRepository.create(userId, productId);

    return {
      id: created.id,
      productId: created.productId,
      addedAt: created.createdAt.toISOString(),
      product: this.toSummary(created.product),
    };
  }

  static async removeFromWishlist(userId: string, productId: string): Promise<void> {
    const existing = await wishlistRepository.findByUserAndProduct(userId, productId);
    if (!existing) {
      throw new AppError(
        'Product not found in your wishlist',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    await wishlistRepository.delete(userId, productId);
  }
}
