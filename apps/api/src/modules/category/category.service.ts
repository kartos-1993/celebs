import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';
import slugify from 'slugify';

import type {
  CategoryAttributeType,
  CreateCategoryType,
  UpdateCategoryType,
} from '@celebs/shared-types';

import { CategoryRepository, categoryRepository as defaultCategoryRepo } from './category.repository';

export type CategoryAttribute = CategoryAttributeType & {
  id?: string;
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

interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  level: number;
  parentCategory?: string | null;
  parent?: string | null;
  path?: string | string[];
  attributes?: any[];
  imageUrl?: string | null;
  children: CategoryTreeNode[];
}

interface PaginatedCategoriesResponse {
  categories: any[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export class CategoryService {
  private static readonly DEFAULT_PAGE = 1;
  private static readonly DEFAULT_LIMIT = 50;

  constructor(private categoryRepository: CategoryRepository = defaultCategoryRepo) {}

  async createCategory(categoryData: CategoryInput): Promise<any> {
    await this.validateCategoryUniqueness(categoryData.name, categoryData.parent || null);

    const categoryDoc = await this.createCategoryDocument(categoryData);

    if (this.hasAttributes(categoryData)) {
      await this.updateCategoryAttributes(
        categoryDoc.id,
        categoryData.attributes!,
      );
    }

    return await this.categoryRepository.findById(categoryDoc.id);
  }

  async getAllCategories(
    page: number = CategoryService.DEFAULT_PAGE,
    limit: number = CategoryService.DEFAULT_LIMIT,
  ): Promise<PaginatedCategoriesResponse> {
    const total = await this.categoryRepository.countDocuments();
    const pages = Math.ceil(total / limit);
    const categories = await this.categoryRepository.find({}, limit);

    return { categories, total, page, limit, pages };
  }

  async searchCategories(query: string, limit = 20) {
    if (!query || !query.trim()) return [];
    const results = await this.categoryRepository.find({ name: query.trim() }, limit);
    return results.map((c: any) => ({
      id: String(c.id),
      name: c.name,
      parentId: c.parentCategory ? String(c.parentCategory) : null,
      hasChildren: false,
      level: c.level ?? (Array.isArray(c.path) ? Math.max(0, c.path.length - 1) : 0),
      path: Array.isArray(c.path) && c.path.length ? c.path : [c.name],
    }));
  }

  async getCategoryById(id: string): Promise<any | null> {
    this.validateObjectId(id);
    return await this.categoryRepository.findById(id);
  }

  async getCategoryTreeWithAttributes(activeOnly = false): Promise<CategoryTreeNode[]> {
    const categories = await this.fetchCategoriesWithAttributes(activeOnly);
    return this.buildCategoryTree(categories);
  }

  async getCategoryFilters(categoryId: string): Promise<any[]> {
    this.validateObjectId(categoryId);
    const category = await this.categoryRepository.findById(categoryId);
    return Array.isArray(category?.attributes) ? category.attributes : [];
  }

  async updateCategory(
    categoryId: string,
    updateData: CategoryUpdateInput,
  ): Promise<any> {
    this.validateObjectId(categoryId);

    const existingCategory = await this.getExistingCategoryOrThrow(categoryId);
    await this.validateUpdateData(updateData, categoryId, existingCategory);

    if (updateData.name) {
      const oldSlug = existingCategory.slug;
      const newSlug = slugify(updateData.name, { lower: true, strict: true });
      updateData.slug = newSlug;

      await this.categoryRepository.updateById(categoryId, {
        ...updateData,
        path: Array.isArray(existingCategory.path)
          ? existingCategory.path.map((slug: string) => (slug === oldSlug ? newSlug : slug))
          : newSlug,
      });

      await this.updateCategoryPathsRecursively(categoryId, oldSlug, newSlug);
    } else {
      await this.categoryRepository.updateById(categoryId, updateData);
    }

    if (updateData.attributes) {
      await this.updateCategoryAttributes(categoryId, updateData.attributes);
    }

    const updatedCategory = await this.getCategoryById(categoryId);
    if (!updatedCategory) {
      throw new AppError(
        'Failed to update category',
        HTTPSTATUS.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_SERVER_ERROR,
      );
    }

    return updatedCategory;
  }

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

    const childCategoriesCount = await this.categoryRepository.countDocuments({
      parentCategory: categoryId,
    });

    if (childCategoriesCount > 0) {
      throw new AppError(
        `Cannot delete category "${category.name}" because it has ${childCategoriesCount} subcategory(ies) associated with it. Please delete or move them first.`,
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const productsCount = await this.categoryRepository.countProductsByCategory(categoryId);

    if (productsCount > 0) {
      throw new AppError(
        `Cannot delete category "${category.name}" because it is currently assigned to ${productsCount} product(s). Please reassign or delete the products first.`,
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    await this.categoryRepository.deleteById(categoryId);
  }

  private hasAttributes(categoryData: CategoryInput): boolean {
    return !!(categoryData.attributes && categoryData.attributes.length > 0);
  }

  private fetchCategoriesWithAttributes(activeOnly = false): Promise<any[]> {
    const query = activeOnly ? { isActive: true } : {};
    return this.categoryRepository.find(query);
  }

  private buildCategoryTree(categories: any[]): CategoryTreeNode[] {
    const categoryMap: Record<string, CategoryTreeNode> = {};

    categories.forEach((cat) => {
      const idStr = String(cat.id);
      categoryMap[idStr] = { ...cat, id: idStr, children: [] };
    });

    const rootCategories: CategoryTreeNode[] = [];

    categories.forEach((cat) => {
      const idStr = String(cat.id);
      const categoryNode = categoryMap[idStr];
      const parentId = cat.parentCategory || cat.parent;

      if (parentId && categoryMap[String(parentId)]) {
        categoryMap[String(parentId)].children.push(categoryNode);
      } else {
        rootCategories.push(categoryNode);
      }
    });

    return rootCategories;
  }

  private validateObjectId(id: string): void {
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new AppError(
        'Invalid category ID',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }
  }

  private async getExistingCategoryOrThrow(categoryId: string) {
    const existingCategory = await this.categoryRepository.findById(categoryId);
    if (!existingCategory) {
      throw new AppError(
        'Category not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.CATEGORY_NOT_FOUND,
      );
    }
    return existingCategory;
  }

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
      const parentCategory = await this.categoryRepository.findById(String(updateData.parent));
      if (!parentCategory) {
        throw new AppError(
          'Parent category not found',
          HTTPSTATUS.NOT_FOUND,
          ErrorCode.CATEGORY_NOT_FOUND,
        );
      }

      if (parentCategory.level >= 3) {
        throw new AppError(
          'Cannot assign a Level 3 subcategory as a parent category',
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.INVALID_REQUEST,
        );
      }

      updateData.level = parentCategory.level + 1;
      const parentPathParts = Array.isArray(parentCategory.path)
        ? parentCategory.path
        : typeof parentCategory.path === 'string' && parentCategory.path.length > 0
        ? parentCategory.path.split('/')
        : [];
      updateData.path = [...parentPathParts, existingCategory.slug];
    } else {
      updateData.level = 1;
      updateData.path = [existingCategory.slug];
    }
  }

  private async validateNameUpdate(
    updateData: CategoryUpdateInput,
    categoryId: string,
    existingCategory: any,
  ): Promise<void> {
    const parentVal = updateData.parent !== undefined ? updateData.parent : existingCategory.parentCategory;

    const duplicateCategory = await this.categoryRepository.findOne({
      name: updateData.name,
      parentCategory: parentVal ? String(parentVal) : null,
    });

    if (duplicateCategory && String(duplicateCategory.id) !== categoryId) {
      throw new AppError(
        'Category with this name already exists under the same parent',
        HTTPSTATUS.CONFLICT,
        ErrorCode.CATEGORY_ALREADY_EXISTS,
      );
    }

    updateData.slug = slugify(updateData.name!, { lower: true, strict: true });
  }

  private async updateCategoryAttributes(
    categoryId: string,
    attributes: CategoryAttribute[],
  ): Promise<void> {
    const formattedAttributes = attributes.map((attr) => ({
      name: attr.name,
      type: attr.type,
      values: Array.isArray(attr.values) ? attr.values : [],
      isRequired: !!attr.isRequired,
      group: attr.group || 'basic',
      isVariant: !!attr.isVariant,
      variantType: (attr as any).variantType ?? null,
      useStandardOptions: !!attr.useStandardOptions,
    }));

    await this.categoryRepository.updateById(categoryId, {
      attributes: formattedAttributes,
    });
  }

  private async validateCategoryUniqueness(
    name: string,
    parent: string | null,
  ): Promise<void> {
    const existingCategory = await this.categoryRepository.findOne({
      name,
      parentCategory: parent ? String(parent) : null,
    });

    if (existingCategory) {
      throw new AppError(
        'Category with this name already exists under the same parent',
        HTTPSTATUS.CONFLICT,
        ErrorCode.CATEGORY_ALREADY_EXISTS,
      );
    }
  }

  private async createCategoryDocument(
    categoryData: CategoryInput,
  ): Promise<any> {
    return await this.categoryRepository.create({
      name: categoryData.name,
      slug: categoryData.slug,
      path: categoryData.path,
      level: categoryData.level,
      parentCategory: categoryData.parent ? String(categoryData.parent) : null,
      attributes: categoryData.attributes || [],
      imageUrl: categoryData.imageUrl || null,
      sizeChartColumns: categoryData.sizeChartColumns || [],
    });
  }

  private async updateCategoryPathsRecursively(
    categoryId: string,
    oldSlug: string,
    newSlug: string,
  ): Promise<void> {
    const children = await this.categoryRepository.find({ parentCategory: categoryId });

    for (const child of children) {
      const childPath = Array.isArray(child.path)
        ? child.path.map((slug: string) => (slug === oldSlug ? newSlug : slug))
        : child.path;

      await this.categoryRepository.updateById(child.id, {
        path: childPath,
      });

      await this.updateCategoryPathsRecursively(child.id, oldSlug, newSlug);
    }
  }
}
