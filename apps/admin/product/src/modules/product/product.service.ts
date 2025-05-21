import { Types } from 'mongoose';
import { AppError } from '../../common/utils/AppError';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { HTTPSTATUS } from '../../config/http.config';
import { ProductModel, IProduct } from '../../db/models/product.model';
import { CategoryModel } from '../../db/models/category.model';
import { SubcategoryModel } from '../../db/models/subcategory.model';

export class ProductService {
  /**
   * Create a new product
   */
  async createProduct(productData: Partial<IProduct>): Promise<IProduct> {
    // Validate category exists
    if (productData.category) {
      const categoryExists = await CategoryModel.exists({ _id: productData.category });
      if (!categoryExists) {
        throw new AppError(
          'Category not found',
          HTTPSTATUS.NOT_FOUND,
          ErrorCode.CATEGORY_NOT_FOUND
        );
      }
    }

    // Validate subcategory exists
    if (productData.subcategory) {
      const subcategoryExists = await SubcategoryModel.exists({ _id: productData.subcategory });
      if (!subcategoryExists) {
        throw new AppError(
          'Subcategory not found',
          HTTPSTATUS.NOT_FOUND,
          ErrorCode.SUBCATEGORY_NOT_FOUND
        );
      }
    }

    // Create new product
    const product = new ProductModel(productData);
    await product.save();
    return product;
  }

  /**
   * Get all products with optional filtering and pagination
   */
  async getAllProducts(
    filters: Record<string, any> = {},
    page: number = 1,
    limit: number = 20,
    sort: string = '-createdAt'
  ): Promise<{
    products: IProduct[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;
    
    // Build query filters
    const queryFilters: Record<string, any> = { ...filters };
    
    // Handle search by name
    if (queryFilters.name) {
      queryFilters.name = { $regex: queryFilters.name, $options: 'i' };
    }
    
    // Handle price range
    if (queryFilters.minPrice || queryFilters.maxPrice) {
      queryFilters.price = {};
      if (queryFilters.minPrice) {
        queryFilters.price.$gte = Number(queryFilters.minPrice);
        delete queryFilters.minPrice;
      }
      if (queryFilters.maxPrice) {
        queryFilters.price.$lte = Number(queryFilters.maxPrice);
        delete queryFilters.maxPrice;
      }
    }
    
    const total = await ProductModel.countDocuments(queryFilters);
    const pages = Math.ceil(total / limit);
    
    const products = await ProductModel.find(queryFilters)
      .populate('category')
      .populate('subcategory')
      .populate('reviews')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    return {
      products,
      total,
      page,
      limit,
      pages
    };
  }

  /**
   * Get a product by ID
   */
  async getProductById(productId: string): Promise<IProduct> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new AppError('Invalid product ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    const product = await ProductModel.findById(productId)
      .populate('category')
      .populate('subcategory')
      .populate('reviews');
      
    if (!product) {
      throw new AppError(
        'Product not found', 
        HTTPSTATUS.NOT_FOUND, 
        ErrorCode.PRODUCT_NOT_FOUND
      );
    }

    return product;
  }

  /**
   * Update a product
   */
  async updateProduct(productId: string, updateData: Partial<IProduct>): Promise<IProduct> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new AppError('Invalid product ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    // Validate category exists if being updated
    if (updateData.category) {
      const categoryExists = await CategoryModel.exists({ _id: updateData.category });
      if (!categoryExists) {
        throw new AppError(
          'Category not found',
          HTTPSTATUS.NOT_FOUND,
          ErrorCode.CATEGORY_NOT_FOUND
        );
      }
    }

    // Validate subcategory exists if being updated
    if (updateData.subcategory) {
      const subcategoryExists = await SubcategoryModel.exists({ _id: updateData.subcategory });
      if (!subcategoryExists) {
        throw new AppError(
          'Subcategory not found',
          HTTPSTATUS.NOT_FOUND,
          ErrorCode.SUBCATEGORY_NOT_FOUND
        );
      }
    }

    const product = await ProductModel.findByIdAndUpdate(
      productId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('category')
      .populate('subcategory')
      .populate('reviews');

    if (!product) {
      throw new AppError(
        'Product not found', 
        HTTPSTATUS.NOT_FOUND, 
        ErrorCode.PRODUCT_NOT_FOUND
      );
    }

    return product;
  }

  /**
   * Delete a product
   */
  async deleteProduct(productId: string): Promise<{ success: boolean }> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new AppError('Invalid product ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    const product = await ProductModel.findById(productId);
    if (!product) {
      throw new AppError(
        'Product not found', 
        HTTPSTATUS.NOT_FOUND, 
        ErrorCode.PRODUCT_NOT_FOUND
      );
    }

    await ProductModel.findByIdAndDelete(productId);
    return { success: true };
  }

  /**
   * Update product stock
   */
  async updateProductStock(
    productId: string, 
    colorId: string, 
    sizeId: string,
    quantity: number
  ): Promise<IProduct> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new AppError('Invalid product ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }    const product = await ProductModel.findById(productId);
    if (!product) {
      throw new AppError(
        'Product not found', 
        HTTPSTATUS.NOT_FOUND, 
        ErrorCode.PRODUCT_NOT_FOUND
      );
    }

    // Find the color variant by name instead of _id
    const colorVariant = product.colorVariants.find((color) => color.name === colorId);
    if (!colorVariant) {
      throw new AppError(
        'Color variant not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.PRODUCT_VARIANT_NOT_FOUND
      );
    }

    // Find the size in stock
    const sizeStock = colorVariant.stocks.find((stock) => stock.size === sizeId);
    if (!sizeStock) {
      throw new AppError(
        'Size not found in stock',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.PRODUCT_VARIANT_NOT_FOUND
      );
    }

    // Update the stock
    sizeStock.quantity = quantity;
    
    // Save the updated product
    await product.save();
    
    return product;
  }
}