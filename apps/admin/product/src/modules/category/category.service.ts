import { group } from 'console';
import { ClientSession, Types } from 'mongoose';
import { AppError } from '../../common/utils/AppError';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { HTTPSTATUS } from '../../config/http.config';
import { CategoryModel, ICategory } from '../../db/models/category.model';
import { AttributeModel, IAttribute } from '../../db/models/attribute.model';
import slugify from 'slugify';
import mongoose from 'mongoose';

// Types and Interfaces
interface CategoryAttribute {
  name: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'boolean';
  values: string[];
  group?: string;
  isRequired: boolean;
  // new fields
  isVariant?: boolean;
  variantType?: 'color' | 'size' | null;
  useStandardOptions?: boolean;
  optionSetId?: string | Types.ObjectId | null;
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

interface CategoryTreeNode extends ICategory {
  children: CategoryTreeNode[];
}

interface PaginatedCategoriesResponse {
  categories: ICategory[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/**
 * CategoryService - Handles all category-related operations
 * Follows Domain-Driven Design principles and maintains clean separation of concerns
 */
export class CategoryService {
  private static readonly DEFAULT_PAGE = 1;
  private static readonly DEFAULT_LIMIT = 10;

  /**
   * Creates a new category with its associated attributes
   * @param categoryData - The category data including attributes
   * @returns Promise<ICategory> - The created category with attributes
   */ async createCategory(categoryData: CategoryInput): Promise<ICategory> {
    await this.validateCategoryUniqueness(
      categoryData.name,
      categoryData.parent,
    );

    try {
      const categoryDoc = await this.createCategoryDocument(categoryData);

      if (this.hasAttributes(categoryData)) {
        await this.createCategoryAttributes(
          categoryDoc._id,
          categoryData.attributes,
        );
      }

      return await this.getCategoryWithAttributes(String(categoryDoc._id));
    } catch (error: any) {
      throw new AppError(
        `Failed to create category: ${error.message}`,
        HTTPSTATUS.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retrieves paginated categories with their attributes
   */
  async getAllCategories(
    page: number = CategoryService.DEFAULT_PAGE,
    limit: number = CategoryService.DEFAULT_LIMIT,
  ): Promise<PaginatedCategoriesResponse> {
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

    return { categories, total, page, limit, pages };
  }

  /**
   * Retrieves a single category by ID with its attributes
   */
  async getCategoryById(id: string): Promise<ICategory | null> {
    this.validateObjectId(id);

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
   * Builds and returns the complete category tree with attributes
   * Optimized for UI consumption with clear separation of children and attributes
   */
  async getCategoryTreeWithAttributes(): Promise<CategoryTreeNode[]> {
    const categories = await this.fetchCategoriesWithAttributes();
    return this.buildCategoryTree(categories);
  }

  /**
   * Updates a category and all its descendants if name is changed
   * Uses transaction to ensure consistency
   */
  async updateCategory(
    categoryId: string,
    updateData: CategoryUpdateInput,
  ): Promise<ICategory> {
    this.validateObjectId(categoryId);

    const existingCategory = await this.getExistingCategoryOrThrow(categoryId);
    await this.validateUpdateData(updateData, categoryId, existingCategory);

    try {
      // If name is updated, handle slug and path updates
      if (updateData.name) {
        const oldSlug = existingCategory.slug;
        const newSlug = slugify(updateData.name, {
          lower: true,
          strict: true,
        });
        updateData.slug = newSlug;

        // Update own slug and paths
        await CategoryModel.findByIdAndUpdate(categoryId, {
          ...updateData,
          path: existingCategory.path.map((slug) =>
            slug === oldSlug ? newSlug : slug,
          ),
        });

        // Update all descendant paths without using session
        await this.updateCategoryPathsRecursively(categoryId, oldSlug, newSlug);
      } else {
        // If name is not updated, just update other fields
        await CategoryModel.findByIdAndUpdate(categoryId, updateData);
      }

      // Update attributes if provided
      if (updateData.attributes) {
        await this.updateCategoryAttributes(categoryId, updateData.attributes);
      }

      // Fetch and return the updated category with its attributes
      const updatedCategory = await this.getCategoryById(categoryId);
      if (!updatedCategory) {
        throw new AppError(
          'Category not found after update',
          HTTPSTATUS.NOT_FOUND,
          ErrorCode.CATEGORY_NOT_FOUND,
        );
      }
      return updatedCategory;
    } catch (error) {
      throw error;
    }
  }
  /**
   * Deletes a category and its associated attributes
   */
  async deleteCategory(categoryId: string): Promise<CategoryDeleteResult> {
    this.validateObjectId(categoryId);

    const existingCategory = await this.getExistingCategoryOrThrow(categoryId);

    // Delete all attributes first
    await this.deleteAttributesByCategoryId(categoryId);

    // Then delete the category
    await CategoryModel.findByIdAndDelete(categoryId);
    return { success: true };
  }
  /**
   * Recursively deletes a category, its child categories, and all their attributes
   */
  private async deleteChildCategories(category: any): Promise<void> {
    const childCategories = await CategoryModel.find({ parent: category._id });

    for (const childCategory of childCategories) {
      await this.deleteChildCategories(childCategory);
    }

    // Delete attributes first
    await this.deleteAttributesByCategoryId(category._id);
    // Then delete the category
    await CategoryModel.findByIdAndDelete(category._id);
  }

  /**
   * Deletes a category and cascades to delete its children and attributes
   */
  async deleteCategoryWithCascade(categoryId: string): Promise<void> {
    const category = await this.getCategoryById(categoryId);
    if (!category) {
      throw new AppError(
        'Category not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.CATEGORY_NOT_FOUND,
      );
    }

    // Start the recursive deletion process
    await this.deleteChildCategories(category);
  }

  // Attribute Management Methods

  /**
   * Updates a specific attribute
   */
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

  /**
   * Deletes a specific attribute
   */
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

  /**
   * Deletes all attributes for a specific category
   */
  async deleteAttributesByCategoryId(categoryId: string): Promise<void> {
    await AttributeModel.deleteMany({ categoryId });
  }

  // Private Helper Methods

  /**
   * Validates that a category name is unique within the same parent
   */
  private async validateCategoryUniqueness(
    name: string,
    parent: string | null,
  ): Promise<void> {
    const existingCategory = await CategoryModel.findOne({ name, parent });

    if (existingCategory) {
      throw new AppError(
        'Category with this name already exists under the same parent',
        HTTPSTATUS.CONFLICT,
        ErrorCode.CATEGORY_ALREADY_EXISTS,
      );
    }
  }
  /**
   * Creates the core category document
   */
  private async createCategoryDocument(
    categoryData: CategoryInput,
  ): Promise<ICategory> {
    return await CategoryModel.create({
      name: categoryData.name,
      parent: categoryData.parent,
      slug: categoryData.slug,
      level: categoryData.level,
      path: categoryData.path,
    });
  }

  /**
   * Checks if category has attributes to create
   */
  private hasAttributes(categoryData: CategoryInput): boolean {
    return categoryData.attributes && categoryData.attributes.length > 0;
  }

  /**
   * Creates attributes for a category in parallel
   */
  private async createCategoryAttributes(
    categoryId: any,
    attributes: CategoryAttribute[],
  ): Promise<void> {
    await Promise.all(
      attributes.map((attr) =>
        AttributeModel.create({
          categoryId,
          name: attr.name,
          type: attr.type,
          values: this.processAttributeValues(attr),
          isRequired: attr.isRequired,
          isVariant: !!attr.isVariant,
          variantType: (attr as any).variantType ?? (attr as any).variantAxis ?? null,
          useStandardOptions: !!attr.useStandardOptions,
          optionSetId: attr.optionSetId
            ? typeof attr.optionSetId === 'string'
              ? new Types.ObjectId(attr.optionSetId)
              : (attr.optionSetId as any)
            : null,
        }),
      ),
    );
  }

  /**
   * Processes attribute values based on type
   */
  private processAttributeValues(attr: CategoryAttribute): string[] {
    if (attr.type === 'select' || attr.type === 'multiselect') {
      return Array.isArray(attr.values) ? attr.values : [attr.values];
    }
    return [];
  }

  /**
   * Retrieves a category with its attributes
   */
  private async getCategoryWithAttributes(
    categoryId: string,
  ): Promise<ICategory> {
    const attributes = await AttributeModel.find({ categoryId }).sort({
      displayOrder: 1,
    });
    const category = await CategoryModel.findById(categoryId);

    if (!category) {
      throw new AppError(
        'Category not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.CATEGORY_NOT_FOUND,
      );
    }

    const categoryWithAttributes = category.toObject();
    (categoryWithAttributes as any).attributes = attributes;
    return categoryWithAttributes as ICategory;
  }

  /**
   * Fetches all categories with their attributes from the database
   */
  private async fetchCategoriesWithAttributes(): Promise<any[]> {
    return await CategoryModel.aggregate([
      {
        $lookup: {
          from: 'attributes',
          localField: '_id',
          foreignField: 'categoryId',
          as: 'attributes',
        },
      },
      { $sort: { name: 1 } },
    ]);
  }

  /**
   * Builds hierarchical tree structure from flat category array
   * Optimized for UI consumption with clear separation of children and attributes
   */
  private buildCategoryTree(categories: any[]): CategoryTreeNode[] {
    const categoryMap: Record<string, CategoryTreeNode> = {};

    // Initialize category map with empty children arrays
    categories.forEach((cat) => {
      categoryMap[cat._id.toString()] = { ...cat, children: [] };
    });

    const rootCategories: CategoryTreeNode[] = [];

    // Build parent-child relationships
    categories.forEach((cat) => {
      const categoryNode = categoryMap[cat._id.toString()];

      if (cat.parent) {
        const parent = categoryMap[cat.parent.toString()];
        if (parent) {
          parent.children.push(categoryNode);
        }
      } else {
        rootCategories.push(categoryNode);
      }
    });

    return rootCategories;
  }
  /**
   * Validates MongoDB ObjectId format
   */
  private validateObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(
        'Invalid category ID',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }
  }

  /**
   * Retrieves existing category or throws error if not found
   */
  private async getExistingCategoryOrThrow(categoryId: string) {
    const existingCategory = await CategoryModel.findById(categoryId);
    if (!existingCategory) {
      throw new AppError(
        'Category not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.CATEGORY_NOT_FOUND,
      );
    }
    return existingCategory;
  }

  /**
   * Validates update data including parent relationships and name uniqueness
   */
  private async validateUpdateData(
    updateData: CategoryUpdateInput,
    categoryId: string,
    existingCategory: any,
  ): Promise<void> {
    if (updateData.parent !== undefined) {
      await this.validateParentUpdate(updateData, categoryId, existingCategory);
    }

    if (updateData.name) {
      await this.validateNameUpdate(updateData, categoryId, existingCategory);
    }
  }

  /**
   * Validates parent update operations
   */
  private async validateParentUpdate(
    updateData: CategoryUpdateInput,
    categoryId: string,
    existingCategory: any,
  ): Promise<void> {
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

      // Update level and path when parent changes
      updateData.level = parentCategory.level + 1;
      updateData.path = [
        ...parentCategory.path.map((p) => p.toString()),
        existingCategory.slug,
      ];
    } else {
      // Making it a root category
      updateData.level = 1;
      updateData.path = [existingCategory.slug];
    }
  }

  /**
   * Validates name update and generates new slug
   */
  private async validateNameUpdate(
    updateData: CategoryUpdateInput,
    categoryId: string,
    existingCategory: any,
  ): Promise<void> {
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

    updateData.slug = slugify(updateData.name!, { lower: true, strict: true });
  }

  /**
   * Updates category attributes (creates new or updates existing)
   */
  private async updateCategoryAttributes(
    categoryId: any,
    attributes: CategoryAttribute[],
    session?: ClientSession,
  ): Promise<void> {
    for (const attr of attributes) {
      const values = this.processAttributeValues(attr);

      const existingAttr = await AttributeModel.findOne(
        {
          categoryId,
          name: attr.name,
        },
        null,
        session ? { session } : undefined,
      );

      if (existingAttr) {
        // Update existing attribute
        existingAttr.values = values;
        existingAttr.isRequired = attr.isRequired;
        existingAttr.type = attr.type;
  existingAttr.isVariant = !!attr.isVariant;
  (existingAttr as any).variantType = (attr as any).variantType ?? (attr as any).variantAxis ?? null;
        existingAttr.useStandardOptions = !!attr.useStandardOptions;
        existingAttr.optionSetId = attr.optionSetId
          ? typeof attr.optionSetId === 'string'
            ? new Types.ObjectId(attr.optionSetId)
            : (attr.optionSetId as any)
          : null;
        await existingAttr.save({ session });
      } else {
        // Create new attribute
        await AttributeModel.create(
          [
            {
              categoryId,
              name: attr.name,
              type: attr.type,
              values,
              isRequired: attr.isRequired,
              // new fields
              isVariant: !!attr.isVariant,
              variantType: (attr as any).variantType ?? (attr as any).variantAxis ?? null,
              useStandardOptions: !!attr.useStandardOptions,
              optionSetId: attr.optionSetId
                ? typeof attr.optionSetId === 'string'
                  ? new Types.ObjectId(attr.optionSetId)
                  : (attr.optionSetId as any)
                : null,
            },
          ],
          session ? { session } : undefined,
        );
      }
    }
  } /**
   * Gets the total number of child categories
   */
  private async getChildCategoriesCount(categoryId: string): Promise<number> {
    const childCount = await CategoryModel.countDocuments({
      parent: categoryId,
    });
    return childCount;
  }

  /**
   * Updates a category's path and all its descendants' paths recursively
   * Uses bulk operations for performance
   */
  private async updateCategoryPathsRecursively(
    categoryId: string,
    oldSlug: string,
    newSlug: string,
    session?: ClientSession,
  ): Promise<void> {
    // Get all descendants
    const categories = session
      ? await CategoryModel.find({ path: oldSlug }, { session })
      : await CategoryModel.find({ path: oldSlug });

    if (categories.length === 0) {
      return;
    }

    // Prepare bulk operations
    const bulkOps = categories.map((category) => ({
      updateOne: {
        filter: { _id: category._id },
        update: {
          $set: {
            path: category.path.map((slug) =>
              slug === oldSlug ? newSlug : slug,
            ),
          },
        },
      },
    }));

    // Execute bulk operations if there are any updates
    if (bulkOps.length > 0) {
      if (session) {
        await CategoryModel.bulkWrite(bulkOps, { session });
      } else {
        await CategoryModel.bulkWrite(bulkOps);
      }
    }
  }
}
