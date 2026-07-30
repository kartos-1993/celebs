import { ClientSession, Types } from 'mongoose';
import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';
import { CategoryModel, ICategory } from '@/db/models/category.model';
import { AttributeModel, IAttribute, AttributeType } from '@/db/models/attribute.model';
import slugify from 'slugify';
import mongoose from 'mongoose';
import { CategoryFilterModel, ICategoryFilter } from '@/db/models/category-filter.model';
import { ProductModel } from '@/db/models/product.model';


import type {
  CategoryAttributeType,
  CreateCategoryType,
  UpdateCategoryType,
} from '@celebs/shared-types';

export type CategoryAttribute = CategoryAttributeType & {
  _id?: string;
};

export type CategoryInput = CreateCategoryType & {
  slug: string;
  level: number;
  path: string[];
};

export type CategoryUpdateInput = UpdateCategoryType & {
  slug?: string;
  level?: number;
  path?: string[];
};


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
   */  async createCategory(categoryData: CategoryInput): Promise<ICategory> {
    await this.validateCategoryUniqueness(
      categoryData.name,
      categoryData.parent ?? null,
    );

    const categoryDoc = await this.createCategoryDocument(categoryData);

    if (this.hasAttributes(categoryData)) {
      await this.createCategoryAttributes(
        categoryDoc._id,
        categoryData.attributes,
      );
    }

    return await this.getCategoryWithAttributes(String(categoryDoc._id));
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
          pipeline: [{ $sort: { createdAt: 1, name: 1 } }],
        },
      },
    ]);

    return { categories, total, page, limit, pages };
  }

  /**
   * Full-text like search on category names; returns flat list with basic fields and path
   */
  async searchCategories(query: string, limit = 20) {
    if (!query || !query.trim()) return [];
    const regex = new RegExp(query.trim(), 'i');
    const results = await CategoryModel.find({ name: regex })
      .sort({ level: 1, name: 1 })
      .limit(limit)
      .lean();
    return results.map((c: any) => ({
      id: String(c._id),
      name: c.name,
      parentId: c.parentCategory ? String(c.parentCategory) : (c.parent ? String(c.parent) : null),
      hasChildren: false, // UI can expand via tree if needed
      level: c.level ?? (Array.isArray(c.path) ? Math.max(0, c.path.length - 1) : 0),
      path: Array.isArray(c.path) && c.path.length ? c.path : [c.name],
    }));
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
          pipeline: [{ $sort: { createdAt: 1, name: 1 } }],
        },
      },
    ]);

    return result[0] || null;
  }
  /**
   * Builds and returns the complete category tree with attributes
   * Optimized for UI consumption with clear separation of children and attributes
   */
  async getCategoryTreeWithAttributes(activeOnly = false): Promise<CategoryTreeNode[]> {
    const categories = await this.fetchCategoriesWithAttributes(activeOnly);
    return this.buildCategoryTree(categories);
  }

  /**
   * Retrieves storefront filters for a category
   */
  async getCategoryFilters(categoryId: string): Promise<ICategoryFilter[]> {
    this.validateObjectId(categoryId);
    return await CategoryFilterModel.find({ categoryId })
      .populate('attributeId')
      .sort({ displayOrder: 1 });
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
    const childCategories = await CategoryModel.find({
      $or: [{ parentCategory: category._id }, { parent: category._id }],
    });

    for (const childCategory of childCategories) {
      await this.deleteChildCategories(childCategory);
    }

    // Delete attributes first
    await this.deleteAttributesByCategoryId(category._id);
    // Then delete the category
    await CategoryModel.findByIdAndDelete(category._id);
  }

  /**
   * Deletes a category safely. Restricts deletion if in use (has child categories or products).
   */
  async deleteCategoryWithCascade(categoryId: string): Promise<void> {
    this.validateObjectId(categoryId);

    const category = await this.getCategoryById(categoryId);
    if (!category) {
      throw new AppError(
        'Category not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.CATEGORY_NOT_FOUND,
      );
    }

    // Check for child subcategories
    const childCategoriesCount = await CategoryModel.countDocuments({
      parentCategory: categoryId,
    });

    if (childCategoriesCount > 0) {
      throw new AppError(
        `Cannot delete category "${category.name}" because it has ${childCategoriesCount} subcategory(ies) associated with it. Please delete or move them first.`,
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    // Check for active products using this category or subcategory
    const productsCount = await ProductModel.countDocuments({
      $or: [
        { category: categoryId },
        { subcategory: categoryId },
      ],
    });

    if (productsCount > 0) {
      throw new AppError(
        `Cannot delete category "${category.name}" because it is currently assigned to ${productsCount} product(s). Please reassign or delete the products first.`,
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    // Delete associated attributes
    await this.deleteAttributesByCategoryId(categoryId);

    // Delete associated filters (clean up DB)
    await CategoryFilterModel.deleteMany({ categoryId });

    // Delete the category itself
    await CategoryModel.findByIdAndDelete(categoryId);
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
   * Helper to safely parse ObjectId for option set ID
   */
  private parseOptionSetId(optionSetId: any): Types.ObjectId | null {
    if (!optionSetId) return null;
    const str = String(optionSetId);
    return Types.ObjectId.isValid(str) ? new Types.ObjectId(str) : null;
  }

  /**
   * Validates that a category name is unique within the same parent
   */
  private async validateCategoryUniqueness(
    name: string,
    parent: string | null,
  ): Promise<void> {
    const parentId = parent && Types.ObjectId.isValid(parent) ? new Types.ObjectId(parent) : null;
    const existingCategory = await CategoryModel.findOne({ name, parentCategory: parentId });

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
      parentCategory: categoryData.parent && Types.ObjectId.isValid(categoryData.parent) ? new Types.ObjectId(categoryData.parent) : null,
      slug: categoryData.slug,
      level: categoryData.level,
      path: categoryData.path,
      imageUrl: categoryData.imageUrl ?? null,
      isActive: categoryData.isActive !== false,
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
          group: (attr.group as any) ?? 'basic',
          isVariant: !!attr.isVariant,
          variantType: (attr as any).variantType ?? (attr as any).variantAxis ?? null,
          useStandardOptions: !!attr.useStandardOptions,
          optionSetId: this.parseOptionSetId(attr.optionSetId),
        }),
      ),
    );
  }

  /**
   * Processes attribute values based on type
   */
  private processAttributeValues(attr: CategoryAttribute): string[] {
    if (Array.isArray(attr.values)) {
      return attr.values
        .map((v) => (typeof v === 'string' ? v.trim() : String(v).trim()))
        .filter(Boolean);
    }
    if (attr.values !== undefined && attr.values !== null && attr.values !== '') {
      return [String(attr.values).trim()].filter(Boolean);
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
      createdAt: 1,
      name: 1,
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
  private async fetchCategoriesWithAttributes(activeOnly = false): Promise<any[]> {
    const pipeline: any[] = [];
    if (activeOnly) {
      pipeline.push({ $match: { isActive: { $ne: false } } });
    }
    pipeline.push(
      {
        $lookup: {
          from: 'attributes',
          localField: '_id',
          foreignField: 'categoryId',
          as: 'attributes',
        },
      },
      { $sort: { name: 1 } }
    );
    return await CategoryModel.aggregate(pipeline);
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
      const parentId = cat.parentCategory || cat.parent;

      if (parentId) {
        const parent = categoryMap[parentId.toString()];
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
    const parentVal = updateData.parent !== undefined ? updateData.parent : existingCategory.parentCategory;
    const parentId = parentVal && Types.ObjectId.isValid(String(parentVal)) ? new Types.ObjectId(String(parentVal)) : null;

    const duplicateCategory = await CategoryModel.findOne({
      name: updateData.name,
      parentCategory: parentId,
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
   * Updates category attributes (creates new, updates existing, and deletes orphaned)
   */
  private async updateCategoryAttributes(
    categoryId: any,
    attributes: CategoryAttribute[],
    session?: ClientSession,
  ): Promise<void> {
    const updatedAttrIds: Types.ObjectId[] = [];

    for (const attr of attributes) {
      const values = this.processAttributeValues(attr);
      const optionSetId = this.parseOptionSetId(attr.optionSetId);

      const existingAttr = attr._id && Types.ObjectId.isValid(String(attr._id))
        ? await AttributeModel.findById(attr._id, null, session ? { session } : undefined)
        : await AttributeModel.findOne(
            { categoryId, name: attr.name },
            null,
            session ? { session } : undefined,
          );

      if (existingAttr) {
        // Update existing attribute
        existingAttr.name = attr.name;
        existingAttr.label = attr.label ?? existingAttr.label;
        existingAttr.placeholder = attr.placeholder ?? existingAttr.placeholder;
        if (attr.info) {
          existingAttr.info = {
            help: attr.info.help ?? existingAttr.info?.help,
            top: attr.info.top ?? existingAttr.info?.top,
          };
        }
        existingAttr.values = values;
        existingAttr.isRequired = !!attr.isRequired;
        existingAttr.type = attr.type;
        existingAttr.group = (attr.group as IAttribute['group']) ?? existingAttr.group ?? 'basic';
        existingAttr.isVariant = !!attr.isVariant;
        existingAttr.useStandardOptions = !!attr.useStandardOptions;
        existingAttr.optionSetId = optionSetId;

        existingAttr.markModified('values');
        existingAttr.markModified('type');
        existingAttr.markModified('info');

        await existingAttr.save({ session });
        updatedAttrIds.push(existingAttr._id as Types.ObjectId);
      } else {
        // Create new attribute
        const created = await AttributeModel.create(
          [
            {
              categoryId,
              name: attr.name,
              label: attr.label,
              placeholder: attr.placeholder,
              info: attr.info,
              type: attr.type,
              values,
              isRequired: !!attr.isRequired,
              group: (attr.group as IAttribute['group']) ?? 'basic',
              isVariant: !!attr.isVariant,
              useStandardOptions: !!attr.useStandardOptions,
              optionSetId,
            },
          ],
          session ? { session } : undefined,
        );
        if (created[0]) {
          updatedAttrIds.push(created[0]._id as Types.ObjectId);
        }
      }
    }

    // Delete orphaned attributes for this category that were removed from the form
    await AttributeModel.deleteMany(
      { categoryId, _id: { $nin: updatedAttrIds } },
      session ? { session } : undefined,
    );
  }

  /**
   * Gets the total number of child categories
   */
  private async getChildCategoriesCount(categoryId: string): Promise<number> {
    const childCount = await CategoryModel.countDocuments({
      parentCategory: categoryId,
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
