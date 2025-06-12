import { ClientSession, Types } from 'mongoose';
import { AppError } from '../../common/utils/AppError';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { HTTPSTATUS } from '../../config/http.config';
import { CategoryModel, ICategory } from '../../db/models/category.model';
import { AttributeModel, IAttribute } from '../../db/models/attribute.model';
import slugify from 'slugify';
import mongoose from 'mongoose';

interface CategoryAttribute {
  name: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'boolean';
  values: string[];
  isRequired: boolean;
}

interface CategoryInput {
  name: string;
  parent: string | null;
  slug: string;
  level: number;
  path: string[];
  attributes: CategoryAttribute[];
}

interface CategoryUpdateInput extends Partial<Omit<CategoryInput, 'parent'>> {
  parent?: string | null;
}

interface CategoryDeleteResult {
  success: boolean;
}

export class CategoryService {
  // Create a new category with attributes
  async createCategory(categoryData: CategoryInput): Promise<ICategory> {
    // Check if category with the same name already exists under the same parent
    const existingCategory = await CategoryModel.findOne({
      name: categoryData.name,
      parent: categoryData.parent,
    });

    if (existingCategory) {
      throw new AppError(
        'Category with this name already exists under the same parent',
        HTTPSTATUS.CONFLICT,
        ErrorCode.CATEGORY_ALREADY_EXISTS,
      );
    }

    try {
      // Create the category first
      const categoryDoc = await CategoryModel.create({
        name: categoryData.name,
        parent: categoryData.parent,
        slug: categoryData.slug,
        level: categoryData.level,
        path: categoryData.path,
      });

      // If attributes are provided, create them in parallel
      if (categoryData.attributes && categoryData.attributes.length > 0) {
        await Promise.all(
          categoryData.attributes.map((attr) =>
            AttributeModel.create({
              categoryId: categoryDoc._id,
              name: attr.name,
              type: attr.type,
              values:
                attr.type === 'select' || attr.type === 'multiselect'
                  ? attr.values
                  : [],
              isRequired: attr.isRequired,
            }),
          ),
        );
      }

      // Get the fresh category with populated attributes
      const attributes = await AttributeModel.find({
        categoryId: categoryDoc._id,
      }).sort({ displayOrder: 1 });

      // Return the category document with attributes
      const categoryWithAttributes = categoryDoc.toObject();
      (categoryWithAttributes as any).attributes = attributes;

      return categoryWithAttributes as ICategory;
    } catch (error: any) {
      throw new AppError(
        `Failed to create category: ${error.message}`,
        HTTPSTATUS.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_SERVER_ERROR,
      );
    }
  }
  /**
   * Get all categories with populated attributes using aggregation
   */
  async getAllCategories(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    categories: ICategory[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const total = await CategoryModel.countDocuments();
    const pages = Math.ceil(total / limit);

    const categories = await CategoryModel.aggregate([
      { $sort: { name: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: 'attributes',
          localField: '_id',
          foreignField: 'categoryId',
          as: 'attributes',
          pipeline: [{ $sort: { displayOrder: 1 } }],
        },
      },
    ]);

    return {
      categories,
      total,
      page,
      limit,
      pages,
    };
  }
  // Get a single category by ID
  async getCategoryById(id: string): Promise<ICategory | null> {
    const result = await CategoryModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'attributes',
          localField: '_id',
          foreignField: 'categoryId',
          as: 'attributes',
          pipeline: [{ $sort: { displayOrder: 1 } }],
        },
      },
    ]);

    return result[0] || null;
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

  // Update an attribute
  async updateAttribute(
    attributeId: string,
    updateData: Partial<IAttribute>,
  ): Promise<IAttribute> {
    const updated = await AttributeModel.findByIdAndUpdate(
      attributeId,
      updateData,
      { new: true, runValidators: true },
    );
    if (!updated) {
      throw new AppError(
        'Attribute not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.ATTRIBUTE_NOT_FOUND,
      );
    }
    return updated;
  }

  // Delete an attribute
  async deleteAttribute(attributeId: string): Promise<{ success: boolean }> {
    const deleted = await AttributeModel.findByIdAndDelete(attributeId);
    if (!deleted) {
      throw new AppError(
        'Attribute not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.ATTRIBUTE_NOT_FOUND,
      );
    }
    return { success: true };
  }

  // Delete all attributes for a category (cascading delete helper)
  async deleteAttributesByCategoryId(categoryId: string): Promise<void> {
    await AttributeModel.deleteMany({ categoryId });
  }

  /**
   * Delete a category and cascade delete its attributes if no child categories exist
   */
  async deleteCategoryWithCascade(categoryId: string): Promise<void> {
    // Check if category exists
    const category = await this.getCategoryById(categoryId);
    if (!category) {
      throw new AppError(
        'Category not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.CATEGORY_NOT_FOUND,
      );
    }
    // Check for child categories
    const childCategories = await this.getAllCategories();
    const hasChildren = childCategories.categories.some(
      (cat) => cat.parent?.toString() === categoryId,
    );
    if (hasChildren) {
      throw new AppError(
        'Cannot delete category with child categories',
        HTTPSTATUS.FORBIDDEN,
        ErrorCode.FORBIDDEN_ACCESS,
      );
    }
    // Delete all related attributes
    await this.deleteAttributesByCategoryId(categoryId);
    // Delete the category itself
    await this.deleteCategory(categoryId);
  }
}
