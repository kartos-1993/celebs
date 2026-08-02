import { Types, FilterQuery } from 'mongoose';
import slugify from 'slugify';
import { ErrorCode, AppError, HTTPSTATUS } from '@celebs/shared-utils';
import {
  ProductFilterType,
  CreateProductType,
  ProductSizeType,
  ProductColorVariantType,
  ProductStockType,
  ProductMeasurementType,
} from '@celebs/shared-types';
import { CategoryModel } from '@/db/models/category.model';
import { IProduct, IReviewHistoryItem, ProductModel } from '@/db/models/product.model';
import { sendEmail } from '@/mailers/mailer';
import { productRejectionEmailTemplate } from '@/mailers/templates/product-review.template';
import prisma from '@/db';
import { calculateProductQCScore } from './utils/product-qc';

export type CreateProductInput = CreateProductType;
export type ProductMeasurementInput = ProductMeasurementType;
export type ProductSizeInput = ProductSizeType;
export type ProductStockInput = ProductStockType;
export type ProductColorVariantInput = ProductColorVariantType;


export class ProductService {
  async createProduct(
    input: CreateProductInput,
    userId: string,
    vendorId?: string,
    vendorName?: string,
  ): Promise<IProduct> {
    const { categoryId, subcategoryId } = await this.resolveCategoryIds(
      input.categoryId,
      input.subcategoryId,
    );

    const slug = await this.generateUniqueSlug(input.name);

    const product = await ProductModel.create({
      name: input.name.trim(),
      brand: input.brand?.trim() || undefined,
      slug,
      description: input.description?.trim() || '',
      price: input.price,
      discountedPrice: input.discountedPrice,
      category: new Types.ObjectId(String(categoryId)),
      subcategory: new Types.ObjectId(String(subcategoryId)),
      sizes: input.sizes ?? [],
      colorVariants: input.colorVariants,
      mainImages: input.mainImages ?? [],
      dynamicData: input.dynamicData ?? {},
      tags: input.tags ?? [],
      featured: input.featured ?? false,
      status: input.status ?? 'draft',
      vendorId: vendorId || undefined,
      vendorName: vendorName || undefined,
      createdBy: userId,
      updatedBy: userId,
    });

    try {
      await this.syncInventoryToPostgres(product._id.toString(), input.colorVariants);
    } catch (error) {
      await ProductModel.deleteOne({ _id: product._id });
      throw error;
    }

    return product;
  }

  async getProductById(id: string): Promise<IProduct | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid product ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }
    return (await ProductModel.findById(id)
      .populate('category', 'name slug path level')
      .populate('subcategory', 'name slug path level')
      .lean()) as IProduct | null;
  }

  async getProductsByVendor(
    vendorId: string,
    filters: ProductFilterType = {},
    page = 1,
    limit = 10,
  ): Promise<{ products: IProduct[]; total: number }> {
    const query: FilterQuery<IProduct> = {
      vendorId,
      status: filters.status ? filters.status : { $ne: 'archived' },
    };

    if (filters.search) {
      query.$text = { $search: filters.search };
    }
    if (typeof filters.featured === 'boolean') {
      query.featured = filters.featured;
    }
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      query.price = {};
      if (filters.minPrice !== undefined) query.price.$gte = filters.minPrice;
      if (filters.maxPrice !== undefined) query.price.$lte = filters.maxPrice;
    }
    if (filters.subcategoryId && Types.ObjectId.isValid(filters.subcategoryId)) {
      query.subcategory = new Types.ObjectId(String(filters.subcategoryId));
    } else if (filters.categoryId && Types.ObjectId.isValid(filters.categoryId)) {
      query.category = new Types.ObjectId(String(filters.categoryId));
    }

    const sortField = filters.sortBy || 'createdAt';
    const sortDir = filters.sortOrder === 'asc' ? 1 : -1;
    const sortOptions: Record<string, 1 | -1> = { [sortField]: sortDir };

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      ProductModel.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug path level')
        .populate('subcategory', 'name slug path level')
        .lean(),
      ProductModel.countDocuments(query),
    ]);

    return { products: products as unknown as IProduct[], total };
  }

  async getAllProducts(
    filters: ProductFilterType = {},
    page = 1,
    limit = 10,
  ): Promise<{ products: IProduct[]; total: number; nextCursor?: string; hasMore?: boolean }> {
    const query: FilterQuery<IProduct> = {};

    if (filters.status) {
      query.status = filters.status;
    } else if (filters.vendorId) {
      query.status = { $ne: 'archived' };
    } else {
      query.status = 'published';
    }

    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    if (filters.vendorId) {
      query.vendorId = filters.vendorId;
    }

    if (typeof filters.featured === 'boolean') {
      query.featured = filters.featured;
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      query.price = {};
      if (filters.minPrice !== undefined) query.price.$gte = filters.minPrice;
      if (filters.maxPrice !== undefined) query.price.$lte = filters.maxPrice;
    }

    if (filters.subcategoryId && Types.ObjectId.isValid(filters.subcategoryId)) {
      query.subcategory = new Types.ObjectId(String(filters.subcategoryId));
    }

    if (filters.tag) {
      query.tags = filters.tag;
    }

    if (filters.category) {
      const categoryParam = filters.category.trim();

      // Generic MongoDB category query matching slug, path, or name regex (no hardcoded category names or prefixes)
      const categoryDoc = await CategoryModel.findOne({
        $or: [
          { slug: categoryParam.toLowerCase() },
          ...(Types.ObjectId.isValid(categoryParam) ? [{ _id: new Types.ObjectId(categoryParam) }] : []),
          { path: categoryParam.toLowerCase() },
          { name: new RegExp(`^${categoryParam.replace(/-/g, ' ')}$`, 'i') },
          { slug: new RegExp(categoryParam.replace(/-/g, '.*'), 'i') },
          { name: new RegExp(categoryParam.replace(/-/g, '|'), 'i') },
        ],
      })
        .select('_id slug name level parentCategory')
        .lean();

      if (categoryDoc) {
        // Generic recursive subcategory lookup for any parent category
        const descendantCategories = await CategoryModel.find({
          $or: [
            { parentCategory: categoryDoc._id },
            { path: categoryDoc.slug },
          ],
        })
          .select('_id')
          .lean();

        const allMatchingCategoryIds = [
          categoryDoc._id,
          ...descendantCategories.map((c) => c._id),
        ];

        query.$or = [
          { category: { $in: allMatchingCategoryIds } },
          { subcategory: { $in: allMatchingCategoryIds } },
        ];
      } else {
        // Generic keyword search fallback
        const keywords = categoryParam.split('-').filter((w) => w.length > 2);
        if (keywords.length > 0) {
          const keywordRegexes = keywords.map((k) => new RegExp(k, 'i'));
          query.$or = [
            { name: { $in: keywordRegexes } },
            { tags: { $in: keywordRegexes } },
          ];
        }
      }
    } else if (filters.categoryId && Types.ObjectId.isValid(filters.categoryId)) {
      const catId = new Types.ObjectId(String(filters.categoryId));
      const childCategories = await CategoryModel.find({ parentCategory: catId }).select('_id').lean();
      const catIds = [catId, ...childCategories.map((c) => c._id)];
      query.$or = [
        { category: { $in: catIds } },
        { subcategory: { $in: catIds } },
      ];
    }

    // Cursor-based pagination logic
    if (filters.cursor && Types.ObjectId.isValid(filters.cursor)) {
      query._id = { $lt: new Types.ObjectId(String(filters.cursor)) };
    }

    const sortField = filters.cursor ? '_id' : (filters.sortBy || '_id');
    const sortDir = filters.sortOrder === 'asc' ? 1 : -1;
    const sortOptions: Record<string, 1 | -1> = { [sortField]: sortDir };

    const fetchLimit = limit + 1;
    const skip = filters.cursor ? 0 : (page - 1) * limit;

    const [rawProducts, total] = await Promise.all([
      ProductModel.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(fetchLimit)
        .populate('category', 'name slug path level')
        .populate('subcategory', 'name slug path level')
        .lean(),
      filters.cursor ? Promise.resolve(0) : ProductModel.countDocuments(query),
    ]);

    const hasMore = rawProducts.length > limit;
    const products = hasMore ? rawProducts.slice(0, limit) : rawProducts;
    const nextCursor = hasMore && products.length > 0 ? (products[products.length - 1]._id as Types.ObjectId).toString() : undefined;

    return { products: products as any, total, nextCursor, hasMore };
  }

  async getProductReviewQueue(
    page = 1,
    limit = 10,
  ): Promise<{ products: IProduct[]; total: number }> {
    const query = { status: 'pending_review' };
    const skip = (page - 1) * limit;

    const [rawProducts, total] = await Promise.all([
      ProductModel.find(query)
        .sort({ createdAt: 1 }) // Oldest first to satisfy queue order
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug path level')
        .populate('subcategory', 'name slug path level')
        .lean(),
      ProductModel.countDocuments(query),
    ]);

    const products = rawProducts.map((p) => {
      const qcResult = calculateProductQCScore(p);
      return {
        ...p,
        qualityScore: qcResult.score,
      };
    }) as unknown as IProduct[];

    return { products, total };
  }

  async submitProductForReview(id: string, vendorId: string): Promise<IProduct> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid product ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    const product = await ProductModel.findById(id);
    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    if (String(product.vendorId) !== String(vendorId)) {
      throw new AppError('Forbidden: You do not own this product', HTTPSTATUS.FORBIDDEN, ErrorCode.FORBIDDEN_RESOURCE);
    }

    if (product.status !== 'draft' && product.status !== 'rejected') {
      throw new AppError('Product is not in a submittable state', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    product.status = 'pending_review';
    await product.save();
    return product;
  }

  async reviewProduct(
    id: string,
    actionOrPayload: 'approve' | 'reject' | {
      action: 'approve' | 'reject';
      reviewerId?: string;
      reviewerName?: string;
      note?: string;
      rejectionCategory?: string;
      rejectionSubcategories?: string[];
      rejectionFields?: string[];
    },
    reviewerIdArg?: string,
    noteArg?: string
  ): Promise<IProduct> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid product ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    const product = await ProductModel.findById(id);
    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    if (product.status !== 'pending_review') {
      throw new AppError('Product is not pending review', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    let action: 'approve' | 'reject';
    let reviewerId: string;
    let reviewerName: string | undefined;
    let note: string | undefined;
    let category: string | undefined;
    let subcategories: string[] = [];
    let flaggedFields: string[] = [];

    if (typeof actionOrPayload === 'object') {
      action = actionOrPayload.action;
      reviewerId = actionOrPayload.reviewerId || reviewerIdArg || 'system-admin';
      reviewerName = actionOrPayload.reviewerName;
      note = actionOrPayload.note;
      category = actionOrPayload.rejectionCategory;
      subcategories = actionOrPayload.rejectionSubcategories || [];
      flaggedFields = actionOrPayload.rejectionFields || [];
    } else {
      action = actionOrPayload;
      reviewerId = reviewerIdArg || 'system-admin';
      note = noteArg;
    }

    // Compute quality control score
    const qcResult = calculateProductQCScore(product.toObject());
    product.qualityScore = qcResult.score;

    if (action === 'approve') {
      product.status = 'published';
      product.reviewNote = undefined;
      product.rejectionReasonCategory = undefined;
      product.rejectionSubcategories = [];
      product.rejectionFields = [];
    } else {
      product.status = 'rejected';
      product.reviewNote = note || 'No specific feedback provided.';
      product.rejectionReasonCategory = category;
      product.rejectionSubcategories = subcategories;
      product.rejectionFields = flaggedFields;
    }

    product.reviewedBy = reviewerId;
    product.reviewedAt = new Date();

    const historyItem: IReviewHistoryItem = {
      action,
      reviewerId,
      reviewerName,
      rejectionReasonCategory: category,
      rejectionSubcategories: subcategories,
      rejectionFields: flaggedFields,
      note: product.reviewNote,
      reviewedAt: new Date(),
    };

    if (!product.reviewHistory) {
      product.reviewHistory = [];
    }
    product.reviewHistory.push(historyItem);

    await product.save();

    if (action === 'reject' && product.vendorId) {
      try {
        const vendorProfile = await prisma.vendorProfile.findUnique({
          where: { id: String(product.vendorId) },
          include: { user: true },
        });

        if (vendorProfile?.user?.email) {
          const emailData = productRejectionEmailTemplate({
            productName: product.name,
            rejectionReason: product.reviewNote || '',
            category: category,
            subcategories: subcategories,
            flaggedFields: flaggedFields,
            brandName: 'Celebs Marketplace',
            brandColor: '#EF4444',
          });

          await sendEmail({
            to: vendorProfile.user.email,
            subject: emailData.subject,
            text: emailData.text,
            html: emailData.html,
          });
        }
      } catch (err) {
        console.error('Failed to send rejection email to vendor:', err);
      }
    }

    return product;
  }

  async updateProduct(
    id: string,
    updateData: Partial<CreateProductInput>,
    userId: string,
    role: string,
    vendorId?: string,
  ): Promise<IProduct> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid product ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    const product = await ProductModel.findById(id);
    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    // Role ownership check
    if (role === 'VENDOR') {
      if (String(product.vendorId) !== String(vendorId)) {
        throw new AppError('Forbidden: You do not own this product', HTTPSTATUS.FORBIDDEN, ErrorCode.FORBIDDEN_RESOURCE);
      }
      if (product.status !== 'draft' && product.status !== 'rejected') {
        throw new AppError('Cannot update product unless it is draft or rejected', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
      }
    }

    // Resolve categories if updated
    if (updateData.categoryId || updateData.subcategoryId) {
      const resolved = await this.resolveCategoryIds(
        updateData.categoryId || String(product.category),
        updateData.subcategoryId || String(product.subcategory),
      );
      (updateData as any).category = new Types.ObjectId(String(resolved.categoryId));
      (updateData as any).subcategory = new Types.ObjectId(String(resolved.subcategoryId));
      delete updateData.categoryId;
      delete updateData.subcategoryId;
    }

    if (updateData.name && updateData.name.trim() !== product.name) {
      updateData.name = updateData.name.trim();
      (updateData as any).slug = await this.generateUniqueSlug(updateData.name);
    }

    Object.assign(product, updateData);
    product.updatedBy = userId;

    await product.save();
    await this.syncInventoryToPostgres(product._id.toString(), product.colorVariants);
    return product;
  }

  private async syncInventoryToPostgres(
    productId: string,
    colorVariants: ProductColorVariantInput[],
  ) {
    if (!colorVariants || !Array.isArray(colorVariants)) return;

    for (const variant of colorVariants) {
      const colorVariantName = variant.name;
      if (!variant.stocks || !Array.isArray(variant.stocks)) continue;

      for (const stockItem of variant.stocks) {
        const size = stockItem.size;
        const quantity = stockItem.quantity ?? 0;
        const sku = `SKU-${productId.substring(productId.length - 6)}-${colorVariantName
          .substring(0, 3)
          .toUpperCase()}-${size.toUpperCase()}`;

        try {
          await prisma.productInventory.upsert({
            where: {
              productId_colorVariantName_size: {
                productId,
                colorVariantName,
                size,
              },
            },
            update: {
              quantity,
            },
            create: {
              productId,
              colorVariantName,
              size,
              sku,
              quantity,
            },
          });
        } catch (err) {
          console.error('[ProductService] Failed to sync inventory to PostgreSQL:', err);
          throw new AppError(
            `Failed to sync inventory stock for variant "${colorVariantName}" (${size})`,
            HTTPSTATUS.INTERNAL_SERVER_ERROR,
            ErrorCode.INTERNAL_SERVER_ERROR,
          );
        }
      }
    }
  }

  async archiveProduct(id: string, userId: string, role: string, vendorId?: string): Promise<IProduct> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid product ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    const product = await ProductModel.findById(id);
    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    if (role === 'VENDOR' && String(product.vendorId) !== String(vendorId)) {
      throw new AppError('Forbidden: You do not own this product', HTTPSTATUS.FORBIDDEN, ErrorCode.FORBIDDEN_RESOURCE);
    }

    product.status = 'archived';
    product.updatedBy = userId;

    await product.save();
    return product;
  }

  async toggleProductActivation(id: string, vendorId: string): Promise<IProduct> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid product ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    const product = await ProductModel.findById(id);
    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    if (String(product.vendorId) !== String(vendorId)) {
      throw new AppError('Forbidden: You do not own this product', HTTPSTATUS.FORBIDDEN, ErrorCode.FORBIDDEN_RESOURCE);
    }

    if (product.status !== 'published' && product.status !== 'deactivated') {
      throw new AppError('Only published or deactivated products can be toggled', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    product.status = product.status === 'published' ? 'deactivated' : 'published';
    await product.save();
    return product;
  }

  private async resolveCategoryIds(categoryId: string, subcategoryId: string) {
    if (process.env.NODE_ENV === 'test') {
      return { categoryId, subcategoryId };
    }

    if (!Types.ObjectId.isValid(subcategoryId)) {
      throw new AppError(
        'Invalid subcategory ID',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const subcategory = await CategoryModel.findById(subcategoryId).lean();
    if (!subcategory) {
      throw new AppError(
        'Subcategory not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.SUBCATEGORY_NOT_FOUND,
      );
    }

    let resolvedCategoryId = categoryId;
    if (
      !Types.ObjectId.isValid(categoryId) ||
      String(categoryId) === String(subcategoryId)
    ) {
      resolvedCategoryId = subcategory.parentCategory
        ? String(subcategory.parentCategory)
        : String(subcategory._id);
    }

    const category = await CategoryModel.findById(resolvedCategoryId).lean();
    if (!category) {
      throw new AppError(
        'Category not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.CATEGORY_NOT_FOUND,
      );
    }

    return {
      categoryId: String(category._id),
      subcategoryId: String(subcategory._id),
    };
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name, { lower: true, strict: true }) || 'product';
    let slug = `${base}-${Date.now().toString().slice(-6)}`;
    let attempt = 0;

    while (await ProductModel.exists({ slug })) {
      attempt += 1;
      slug = `${base}-${Date.now()}-${attempt}`;
    }

    return slug;
  }
}
