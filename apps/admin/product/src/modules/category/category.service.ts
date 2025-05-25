import { Types } from 'mongoose';
import { AppError } from '../../common/utils/AppError';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { HTTPSTATUS } from '../../config/http.config';
import { CategoryModel, ICategory } from '../../db/models/category.model';
import { SubcategoryModel } from '../../db/models/subcategory.model';

export class CategoryService {
  /**
   * Create a new category
   */ async createCategory(
    categoryData: Partial<ICategory>,
  ): Promise<ICategory> {
    // Check if category with the same name already exists
    const existingCategory = await CategoryModel.findOne({
      name: categoryData.name,
    });
    if (existingCategory) {
      throw new AppError(
        'Category with this name already exists',
        HTTPSTATUS.CONFLICT,
        ErrorCode.CATEGORY_ALREADY_EXISTS,
      );
    }

    // Create new category
    const category = new CategoryModel(categoryData);
    await category.save();
    return category;
  }

  /**
   * Get all categories with optional pagination
   */
  async getAllCategories(
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    categories: ICategory[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;
    const total = await CategoryModel.countDocuments();
    const pages = Math.ceil(total / limit);

    const categories = await CategoryModel.find()
      .populate('subcategories')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    return {
      categories,
      total,
      page,
      limit,
      pages,
    };
  }
  /**
   * Get a category by ID
   */
  async getCategoryById(categoryId: string): Promise<ICategory> {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new AppError(
        'Invalid category ID',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const category =
      await CategoryModel.findById(categoryId).populate('subcategories');
    if (!category) {
      throw new AppError(
        'Category not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.CATEGORY_NOT_FOUND,
      );
    }

    return category;
  }
  /**
   * Update a category
   */
  async updateCategory(
    categoryId: string,
    updateData: Partial<ICategory>,
  ): Promise<ICategory> {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new AppError(
        'Invalid category ID',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    // If name is being updated, check for duplicates
    if (updateData.name) {
      const existingCategory = await CategoryModel.findOne({
        name: updateData.name,
        _id: { $ne: categoryId },
      });

      if (existingCategory) {
        throw new AppError(
          'Category with this name already exists',
          HTTPSTATUS.CONFLICT,
          ErrorCode.CATEGORY_ALREADY_EXISTS,
        );
      }
    }
    const category = await CategoryModel.findByIdAndUpdate(
      categoryId,
      updateData,
      { new: true, runValidators: true },
    ).populate('subcategories');

    if (!category) {
      throw new AppError(
        'Category not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.CATEGORY_NOT_FOUND,
      );
    }

    return category;
  }
  /**
   * Delete a category
   */
  async deleteCategory(categoryId: string): Promise<{ success: boolean }> {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new AppError(
        'Invalid category ID',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const category = await CategoryModel.findById(categoryId);
    if (!category) {
      throw new AppError(
        'Category not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.CATEGORY_NOT_FOUND,
      );
    }

    // Delete all associated subcategories
    if (category.subcategories.length > 0) {
      await SubcategoryModel.deleteMany({
        _id: { $in: category.subcategories },
      });
    }

    await CategoryModel.findByIdAndDelete(categoryId);
    return { success: true };
  }
}
