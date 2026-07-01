import { Types } from 'mongoose';
import slugify from 'slugify';
import { ErrorCode, AppError, HTTPSTATUS } from '@celebs/shared-utils';
import { CategoryModel } from '../../db/models/category.model';
import { IProduct, ProductModel } from '../../db/models/product.model';

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
  status?: 'draft' | 'published' | 'archived';
}

export class ProductService {
  async createProduct(
    input: CreateProductInput,
    userId: string,
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
      createdBy: userId,
      updatedBy: userId,
    });
  }

  private async resolveCategoryIds(categoryId: string, subcategoryId: string) {
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
