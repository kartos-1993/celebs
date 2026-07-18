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
    const query = await this.buildCategoryQuery(categorySlug);
    
    // Add cursor logic for infinite scroll
    if (cursor) {
      query._id = { $gt: cursor };
    }
    
    const products = await ProductModel.find(query)
      .limit(limit)
      .lean();

    return products.map(this.formatProductPayload);
  }

  async getCategories() {
    const categories = await CategoryModel.find({ level: 1 }).sort({ name: 1 }).lean();
    return categories.map(c => ({
      id: c.slug,
      label: c.name,
    }));
  }

  // --- Helpers ---

  private async buildCategoryQuery(categorySlug?: string) {
    const query: any = { status: 'published' };
    if (categorySlug) {
      const category = await CategoryModel.findOne({ slug: categorySlug.toLowerCase() });
      if (category) {
        // Find all subcategories in this tree (e.g. all that start with this path)
        const subCats = await CategoryModel.find({ path: category.slug });
        const catIds = subCats.map((c: any) => c._id);
        
        query.$or = [
          { category: { $in: catIds } },
          { subcategory: { $in: catIds } }
        ];
      }
    }
    return query;
  }

  private async fetchBanners(category: string) {
    // Mock Banners
    return [
      { id: '1', imageUrl: 'http://192.168.1.69:3333/seed-images/shein_mens_promo_banner_v2.png', link: '/deals' },
      { id: '2', imageUrl: 'https://images.unsplash.com/photo-1489980557514-251d61e3eeb6?q=80&w=800', link: '/super-start' }
    ];
  }

  private async fetchHotDeals(categorySlug: string) {
    const query = await this.buildCategoryQuery(categorySlug);
    const products = await ProductModel.find(query)
      .sort({ discount: -1 })
      .limit(5)
      .lean();
    return products.map(this.formatProductPayload);
  }

  private async fetchPopularPicks(categorySlug: string) {
    const query = await this.buildCategoryQuery(categorySlug);
    const products = await ProductModel.find(query)
      .limit(5)
      .lean();
    return products.map(this.formatProductPayload);
  }

  private async fetchTrends(categorySlug: string) {
    // Implementing TrendScore logic (Mocking views/ATC for now, sorting by created date as fallback)
    // Products created in last 7 days get a boost. 
    // In actual implementation, we'd multiply interactions by weight.
    const query = await this.buildCategoryQuery(categorySlug);
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
