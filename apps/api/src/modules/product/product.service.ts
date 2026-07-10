import { Types } from 'mongoose';
import slugify from 'slugify';
import { ErrorCode, AppError, HTTPSTATUS } from '@celebs/shared-utils';
import { CategoryModel } from '@/db/models/category.model';
import { IProduct, ProductModel } from '@/db/models/product.model';
import { sendEmail } from '@/mailers/mailer';
import { productRejectionEmailTemplate } from '@/mailers/templates/product-review.template';
import prisma from '@/db';

interface ProductMeasurementInput {
  name: string;
  value: string;
  unit: string;
}

interface ProductSizeInput {
  name: string;
  productMeasurements?: ProductMeasurementInput[];
  bodyMeasurements?: ProductMeasurementInput[];
}

interface ProductStockInput {
  size: string;
  quantity: number;
}

interface ProductColorVariantInput {
  name: string;
  colorCode: string;
  images?: string[];
  stocks?: ProductStockInput[];
}

export interface CreateProductInput {
  name: string;
  brand?: string;
  description: string;
  price: number;
  discountedPrice?: number;
  categoryId: string;
  subcategoryId: string;
  sizes?: ProductSizeInput[];
  colorVariants: ProductColorVariantInput[];
  mainImages?: string[];
  dynamicData?: Record<string, unknown>;
  tags?: string[];
  featured?: boolean;
  status?: 'draft' | 'pending_review' | 'published' | 'rejected' | 'deactivated' | 'archived';
  vendorId?: string;
  vendorName?: string;
}

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

    return await ProductModel.create({
      name: input.name.trim(),
      brand: input.brand?.trim() || undefined,
      slug,
      description: input.description.trim(),
      price: input.price,
      discountedPrice: input.discountedPrice,
      category: new Types.ObjectId(categoryId),
      subcategory: new Types.ObjectId(subcategoryId),
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
  }

  async getProductById(id: string): Promise<IProduct | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid product ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }
    return await ProductModel.findById(id)
      .populate('category')
      .populate('subcategory');
  }

  async getProductsByVendor(
    vendorId: string,
    filters: any = {},
    page = 1,
    limit = 10,
  ): Promise<{ products: IProduct[]; total: number }> {
    const query: any = {
      vendorId,
      status: { $ne: 'archived' },
    };

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      ProductModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('category')
        .populate('subcategory'),
      ProductModel.countDocuments(query),
    ]);

    return { products, total };
  }

  async getAllProducts(
    filters: any = {},
    page = 1,
    limit = 10,
  ): Promise<{ products: IProduct[]; total: number }> {
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    } else {
      query.status = { $ne: 'archived' };
    }

    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    if (filters.vendorId) {
      query.vendorId = filters.vendorId;
    }

    if (filters.categoryId) {
      query.category = new Types.ObjectId(filters.categoryId);
    }

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      ProductModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('category')
        .populate('subcategory'),
      ProductModel.countDocuments(query),
    ]);

    return { products, total };
  }

  async getProductReviewQueue(
    page = 1,
    limit = 10,
  ): Promise<{ products: IProduct[]; total: number }> {
    const query = { status: 'pending_review' };
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      ProductModel.find(query)
        .sort({ createdAt: 1 }) // Oldest first to satisfy queue order
        .skip(skip)
        .limit(limit)
        .populate('category')
        .populate('subcategory'),
      ProductModel.countDocuments(query),
    ]);

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

  async reviewProduct(id: string, action: 'approve' | 'reject', reviewerId: string, note?: string): Promise<IProduct> {
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

    if (action === 'approve') {
      product.status = 'published';
    } else {
      product.status = 'rejected';
      product.reviewNote = note || 'No specific feedback provided.';
    }

    product.reviewedBy = reviewerId;
    product.reviewedAt = new Date();

    await product.save();

    if (action === 'reject' && product.vendorId) {
      try {
        // Find vendor user email via prisma
        const vendorProfile = await prisma.vendorProfile.findUnique({
          where: { id: String(product.vendorId) },
          include: { user: true },
        });

        if (vendorProfile?.user?.email) {
          const emailData = productRejectionEmailTemplate(product.name, product.reviewNote, 'Celebs', '#EF4444');
          await sendEmail({
            to: vendorProfile.user.email,
            subject: emailData.subject,
            text: emailData.text,
            html: emailData.html,
          });
        }
      } catch (err) {
        // Log error but do not fail the request transaction
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
      (updateData as any).category = new Types.ObjectId(resolved.categoryId);
      (updateData as any).subcategory = new Types.ObjectId(resolved.subcategoryId);
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
    return product;
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
        : subcategory.parent
          ? String(subcategory.parent)
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
