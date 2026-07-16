import { ProductModel } from '@/db/models/product.model';
import { CategoryModel } from '@/db/models/category.model';
import { redisClient } from '@/common/services/redis.client';
import { AppError, HTTPSTATUS } from '@celebs/shared-utils';

export class MobileService {
  async getHomeFeed(categorySlug: string) {
    const cacheKey = `mobile:home:${categorySlug}`;
    
    // Check Cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Parallel fetch with Promise.allSettled
    const [bannersResult, hotDealsResult, popularPicksResult, trendsResult] = await Promise.allSettled([
      this.fetchBanners(categorySlug),
      this.fetchHotDeals(categorySlug),
      this.fetchPopularPicks(categorySlug),
      this.fetchTrends(categorySlug),
    ]);

    const feed = {
      banners: bannersResult.status === 'fulfilled' ? bannersResult.value : [],
      hotDeals: hotDealsResult.status === 'fulfilled' ? hotDealsResult.value : [],
      popularPicks: popularPicksResult.status === 'fulfilled' ? popularPicksResult.value : [],
      trends: trendsResult.status === 'fulfilled' ? trendsResult.value : [],
    };

    // Cache the response with 5 minute TTL (300 seconds)
    await redisClient.setex(cacheKey, 300, JSON.stringify(feed));

    return feed;
  }

  async getProducts(cursor?: string, limit: number = 20, categorySlug?: string) {
    const query: any = { status: 'published' };
    
    // Add cursor logic for infinite scroll
    if (cursor) {
      query._id = { $gt: cursor };
    }

    if (categorySlug) {
      const category = await CategoryModel.findOne({ slug: categorySlug.toLowerCase() });
      if (category) {
        query.category = category._id;
      }
    }
    
    const products = await ProductModel.find(query)
      .limit(limit)
      .lean();

    return products.map(this.formatProductPayload);
  }

  // --- Helpers ---

  private async fetchBanners(category: string) {
    // Mock Banners
    return [
      { id: '1', imageUrl: 'https://via.placeholder.com/800x400?text=Hot+Deals', link: '/deals' },
      { id: '2', imageUrl: 'https://via.placeholder.com/800x400?text=Super+Start', link: '/super-start' }
    ];
  }

  private async fetchHotDeals(categorySlug: string) {
    const query: any = { status: 'published' };
    const category = await CategoryModel.findOne({ slug: categorySlug.toLowerCase() });
    if (category) {
      query.category = category._id;
    }
    const products = await ProductModel.find(query)
      .sort({ discount: -1 })
      .limit(5)
      .lean();
    return products.map(this.formatProductPayload);
  }

  private async fetchPopularPicks(categorySlug: string) {
    const query: any = { status: 'published' };
    const category = await CategoryModel.findOne({ slug: categorySlug.toLowerCase() });
    if (category) {
      query.category = category._id;
    }
    const products = await ProductModel.find(query)
      .limit(5)
      .lean();
    return products.map(this.formatProductPayload);
  }

  private async fetchTrends(categorySlug: string) {
    // Implementing TrendScore logic (Mocking views/ATC for now, sorting by created date as fallback)
    // Products created in last 7 days get a boost. 
    // In actual implementation, we'd multiply interactions by weight.
    const query: any = { status: 'published' };
    const category = await CategoryModel.findOne({ slug: categorySlug.toLowerCase() });
    if (category) {
      query.category = category._id;
    }
    const products = await ProductModel.find(query)
      .sort({ featured: -1, createdAt: -1 })
      .limit(5)
      .lean();
    return products.map(this.formatProductPayload);
  }

  private formatProductPayload(product: any) {
    return {
      id: product._id,
      name: product.name,
      price: product.price,
      discount: product.discountedPrice ? Math.round(((product.price - product.discountedPrice) / product.price) * 100) : 0,
      mainImage: product.mainImages?.[0] || '',
      badge: 'Est. 3 Workdays',
      availableColors: product.colorVariants?.map((v: any) => v.colorCode) || [],
    };
  }
}
