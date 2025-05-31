import { ClientSession, Types } from 'mongoose';
import { AppError } from '../../common/utils/AppError';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { HTTPSTATUS } from '../../config/http.config';
import { CategoryModel, ICategory } from '../../db/models/category.model';
import slugify from 'slugify';

interface CategoryAttribute {
  name: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'boolean';
  values: { value: string; displayOrder: number }[];
  isRequired: boolean;
  displayOrder: number;
  group?: string;
}

interface CategoryInput {
  name: string;
  parent: string | null;
  slug: string;
  level: number;
  path: string[];
  displayOrder: number;
  attributes: CategoryAttribute[];
}

interface CategoryUpdateInput extends Partial<Omit<CategoryInput, 'parent'>> {
  parent?: string | null;
}

interface CategoryDeleteResult {
  success: boolean;
}

export class CategoryService {
  // Create a new category
  async createCategory(
    categoryData: CategoryInput,
    session?: ClientSession,
  ): Promise<ICategory> {
    // Check if category with the same name already exists under the same parent
    const existingCategory = await CategoryModel.findOne({
      name: categoryData.name,
      parent: categoryData.parent,
    }).session(session || null);

    if (existingCategory) {
      throw new AppError(
        'Category with this name already exists under the same parent',
        HTTPSTATUS.CONFLICT,
        ErrorCode.CATEGORY_ALREADY_EXISTS,
      );
    }

    // Process and validate attributes
    const processedAttributes = (categoryData.attributes || []).map((attr) => ({
      name: attr.name,
      type: attr.type,
      values: attr.values,
      isRequired: attr.isRequired,
      displayOrder: attr.displayOrder,
      group: attr.group,
    }));

    try {
      // If session is provided, use transaction
      if (session) {
        const createdCategory = await CategoryModel.create(
          [
            {
              ...categoryData,
              attributes: processedAttributes,
            },
          ],
          { session },
        ).then((docs) => docs[0]);
        return createdCategory;
      }

      // Create category without transaction
      const createdCategory = await CategoryModel.create({
        ...categoryData,
        attributes: processedAttributes,
      });
      return createdCategory;
    } catch (error: any) {
      throw new AppError(
        `Failed to create category: ${error.message}`,
        HTTPSTATUS.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_SERVER_ERROR,
      );
    }
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
      .sort({ displayOrder: 1, name: 1 })
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

    const category = await CategoryModel.findById(categoryId);
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
    updateData: CategoryUpdateInput,
  ): Promise<ICategory> {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new AppError(
        'Invalid category ID',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const existingCategory = await CategoryModel.findById(categoryId);
    if (!existingCategory) {
      throw new AppError(
        'Category not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.CATEGORY_NOT_FOUND,
      );
    }

    // If parent is being updated, validate it
    if (updateData.parent !== undefined) {
      if (updateData.parent === categoryId) {
        throw new AppError(
          'Category cannot be its own parent',
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.INVALID_REQUEST,
        );
      }

      if (updateData.parent) {
        const parentCategory = await CategoryModel.findById(updateData.parent);
        if (!parentCategory) {
          throw new AppError(
            'Parent category not found',
            HTTPSTATUS.NOT_FOUND,
            ErrorCode.CATEGORY_NOT_FOUND,
          );
        }

        // Update level and path if parent changes
        updateData.level = parentCategory.level + 1;
        updateData.path = [
          ...parentCategory.path.map((p) => p.toString()),
          existingCategory.slug,
        ];
      } else {
        // If parent is set to null (making it a root category)
        updateData.level = 1;
        updateData.path = [existingCategory.slug];
      }
    }

    // If name is being updated, check for duplicates and update slug
    if (updateData.name) {
      const duplicateCategory = await CategoryModel.findOne({
        name: updateData.name,
        parent: updateData.parent ?? existingCategory.parent,
        _id: { $ne: categoryId },
      });

      if (duplicateCategory) {
        throw new AppError(
          'Category with this name already exists under the same parent',
          HTTPSTATUS.CONFLICT,
          ErrorCode.CATEGORY_ALREADY_EXISTS,
        );
      }

      updateData.slug = slugify(updateData.name, { lower: true, strict: true });
    }

    const updatedCategory = await CategoryModel.findByIdAndUpdate(
      categoryId,
      updateData,
      { new: true, runValidators: true },
    );

    if (!updatedCategory) {
      throw new AppError(
        'Failed to update category',
        HTTPSTATUS.INTERNAL_SERVER_ERROR,
        ErrorCode.CATEGORY_UPDATE_FAILED,
      );
    }

    return updatedCategory;
  }

  /**
   * Delete a category
   */
  async deleteCategory(categoryId: string): Promise<CategoryDeleteResult> {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new AppError(
        'Invalid category ID',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const existingCategory = await CategoryModel.findById(categoryId);
    if (!existingCategory) {
      throw new AppError(
        'Category not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.CATEGORY_NOT_FOUND,
      );
    }

    // Check if the category has child categories
    const hasChildCategories = await CategoryModel.exists({
      parent: categoryId,
    });

    if (hasChildCategories) {
      throw new AppError(
        'Cannot delete category with child categories',
        HTTPSTATUS.FORBIDDEN,
        ErrorCode.FORBIDDEN_ACCESS,
      );
    }

    await CategoryModel.findByIdAndDelete(categoryId);
    return { success: true };
  }
}
