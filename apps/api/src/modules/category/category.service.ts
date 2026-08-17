import type { Prisma } from '@prisma/client';
import slugify from 'slugify';

import type {
  CategoryAttributeType,
  CategoryEntity,
  CategoryTreeNode,
  CreateCategoryType,
  PaginatedCategoriesResponse,
  RecentCategory,
  UpdateCategoryType,
} from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import {
  CategoryRepository,
  categoryRepository as defaultCategoryRepo,
} from './category.repository';

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

export class CategoryService {
  private static readonly DEFAULT_PAGE = 1;
  private static readonly DEFAULT_LIMIT = 50;
  private categoryRepository: CategoryRepository;

  constructor(categoryRepository?: CategoryRepository) {
    this.categoryRepository = categoryRepository || defaultCategoryRepo;
  }

  async createCategory(categoryData: CreateCategoryType) {
    await this.validateCategoryUniqueness(categoryData.name, categoryData.parentCategory || null);

    const slug = slugify(categoryData.name, { lower: true, strict: true });
    let level = 1;
    let path: string[] = [slug];

    if (categoryData.parentCategory) {
      const parentCat = await this.categoryRepository.findById(String(categoryData.parentCategory));
      if (!parentCat) {
        throw new AppError(
          'Parent category not found',
          HTTPSTATUS.NOT_FOUND,
          ErrorCode.CATEGORY_NOT_FOUND,
        );
      }
      level = parentCat.level + 1;
      const parentPathParts = Array.isArray(parentCat.path)
        ? parentCat.path
        : typeof parentCat.path === 'string' && parentCat.path.length > 0
          ? parentCat.path.split('/')
          : [];
      path = [...parentPathParts, slug];
    }

    const categoryDoc = await this.createCategoryDocument({
      ...categoryData,
      slug,
      level,
      path,
    });
    if (!categoryDoc) {
      throw new AppError(
        'Failed to create category document',
        HTTPSTATUS.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_SERVER_ERROR,
      );
    }

    if (this.hasAttributes(categoryData)) {
      await this.updateCategoryAttributes(categoryDoc.id, categoryData.attributes!);
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
    const term = query.trim();
    const results = await this.categoryRepository.find(
      {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { slug: { contains: term, mode: 'insensitive' } },
          { path: { contains: term, mode: 'insensitive' } },
        ],
      },
      limit,
    );
    return results.map((c: CategoryEntity) => ({
      id: c.id,
      name: c.name,
      parentCategory: c.parentCategory,
      hasChildren: false,
      level: c.level ?? (Array.isArray(c.path) ? Math.max(0, c.path.length - 1) : 0),
      path:
        Array.isArray(c.path) && c.path.length
          ? c.path
          : typeof c.path === 'string' && c.path.length
            ? c.path.split('/')
            : [c.name],
    }));
  }

  async getCategoryById(id: string) {
    this.validateObjectId(id);
    return await this.categoryRepository.findById(id);
  }

  async getCategoryBySlug(slug: string) {
    return await this.categoryRepository.findOne({ slug });
  }

  async getCategoryTree(): Promise<CategoryTreeNode[]> {
    return this.getCategoryTreeWithAttributes();
  }

  async getStorefrontSchema(slug: string) {
    const cat = await this.getCategoryBySlug(slug);
    return cat ? { fields: cat.attributes || [] } : null;
  }

  async getCategoryTreeWithAttributes(activeOnly = false): Promise<CategoryTreeNode[]> {
    const categories = await this.fetchCategoriesWithAttributes(activeOnly);
    return this.buildCategoryTree(categories);
  }

  async getCategoryFilters(categoryId: string) {
    this.validateObjectId(categoryId);
    const category = await this.categoryRepository.findById(categoryId);
    return Array.isArray(category?.attributes) ? category.attributes : [];
  }

  async updateCategory(categoryId: string, updateData: CategoryUpdateInput) {
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
          ? existingCategory.path.map((slug: string) => (slug === oldSlug ? newSlug : slug)).join('/')
          : newSlug,
      });

      await this.updateCategoryPathsRecursively(categoryId, oldSlug, newSlug);
    } else {
      await this.categoryRepository.updateById(categoryId, {
        ...updateData,
        path: Array.isArray(updateData.path) ? updateData.path.join('/') : updateData.path,
      });
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
      throw new AppError('Category not found', HTTPSTATUS.NOT_FOUND, ErrorCode.CATEGORY_NOT_FOUND);
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

    const productsCount =
      await this.categoryRepository.countProductsByCategory(categoryId);

    if (productsCount > 0) {
      throw new AppError(
        `Cannot delete category "${category.name}" because it is currently assigned to ${productsCount} product(s). Please reassign or delete the products first.`,
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    await this.categoryRepository.deleteById(categoryId);
  }

  private hasAttributes(categoryData: CreateCategoryType): boolean {
    return !!(categoryData.attributes && categoryData.attributes.length > 0);
  }

  private fetchCategoriesWithAttributes(activeOnly = false) {
    const query = activeOnly ? { isActive: true } : {};
    return this.categoryRepository.find(query);
  }

  private buildCategoryTree(categories: CategoryEntity[]): CategoryTreeNode[] {
    const categoryMap: Record<string, CategoryTreeNode> = {};

    categories.forEach((cat) => {
      const idStr = cat.id;
      categoryMap[idStr] = {
        ...cat,
        id: idStr,
        name: cat.name,
        slug: cat.slug,
        level: cat.level || 1,
        parentCategory: cat.parentCategory,
        children: [],
      };
    });

    const rootCategories: CategoryTreeNode[] = [];

    categories.forEach((cat) => {
      const idStr = cat.id;
      const categoryNode = categoryMap[idStr];
      if (!categoryNode) return;

      const parentId = cat.parentCategory;
      const parentNode = parentId ? categoryMap[String(parentId)] : undefined;

      if (parentNode) {
        if (!parentNode.children) {
          parentNode.children = [];
        }
        parentNode.children.push(categoryNode);
      } else {
        rootCategories.push(categoryNode);
      }
    });

    return rootCategories;
  }

  private validateObjectId(id: string): void {
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new AppError('Invalid category ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }
  }

  private async getExistingCategoryOrThrow(categoryId: string) {
    const existingCategory = await this.categoryRepository.findById(categoryId);
    if (!existingCategory) {
      throw new AppError('Category not found', HTTPSTATUS.NOT_FOUND, ErrorCode.CATEGORY_NOT_FOUND);
    }
    return existingCategory;
  }

  private async validateUpdateData(
    updateData: CategoryUpdateInput,
    categoryId: string,
    existingCategory: CategoryEntity,
  ): Promise<void> {
    if (updateData.parentCategory !== undefined) {
      await this.validateParentUpdate(updateData, categoryId, existingCategory);
    }

    if (updateData.name) {
      await this.validateNameUpdate(updateData, categoryId, existingCategory);
    }
  }

  private async validateParentUpdate(
    updateData: CategoryUpdateInput,
    categoryId: string,
    existingCategory: CategoryEntity,
  ): Promise<void> {
    if (updateData.parentCategory === categoryId) {
      throw new AppError(
        'Category cannot be its own parent',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    if (updateData.parentCategory) {
      const parentCategory = await this.categoryRepository.findById(String(updateData.parentCategory));
      if (!parentCategory) {
        throw new AppError(
          'Parent category not found',
          HTTPSTATUS.NOT_FOUND,
          ErrorCode.CATEGORY_NOT_FOUND,
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
    existingCategory: CategoryEntity,
  ): Promise<void> {
    const parentVal =
      updateData.parentCategory !== undefined ? updateData.parentCategory : existingCategory.parentCategory;

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

  public async updateCategoryAttributes(
    categoryId: string,
    attributes: CategoryAttributeType[],
  ): Promise<void> {
    const formattedAttributes: CategoryAttributeType[] = attributes.map((attr) => ({
      id: attr.id,
      name: attr.name,
      label: attr.label,
      type: attr.type,
      values: Array.isArray(attr.values) ? attr.values : [],
      isRequired: !!attr.isRequired,
      group: attr.group || 'basic',
      placeholder: attr.placeholder,
      info: attr.info,
      isVariant: !!attr.isVariant,
      useStandardOptions: !!attr.useStandardOptions,
      optionSetId: attr.optionSetId,
    }));

    await this.categoryRepository.updateById(categoryId, {
      attributes: formattedAttributes as unknown as Prisma.InputJsonValue,
    });
  }

  private async validateCategoryUniqueness(name: string, parentCategory: string | null): Promise<void> {
    const existingCategory = await this.categoryRepository.findOne({
      name,
      parentCategory: parentCategory ? String(parentCategory) : null,
    });

    if (existingCategory) {
      throw new AppError(
        'Category with this name already exists under the same parent',
        HTTPSTATUS.CONFLICT,
        ErrorCode.CATEGORY_ALREADY_EXISTS,
      );
    }
  }

  private async createCategoryDocument(categoryData: CategoryInput) {
    return await this.categoryRepository.create({
      name: categoryData.name,
      slug: categoryData.slug,
      path: Array.isArray(categoryData.path) ? categoryData.path.join('/') : categoryData.path,
      level: categoryData.level,
      parentCategory: categoryData.parentCategory ? String(categoryData.parentCategory) : null,
      attributes: (categoryData.attributes || []) as unknown as Prisma.InputJsonValue,
      imageUrl: categoryData.imageUrl || null,
      sizeChartColumns: categoryData.sizeChartColumns || [],
      bodyChartColumns: categoryData.bodyChartColumns || [],
      isActive: categoryData.isActive !== false,
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
        ? child.path.map((slug: string) => (slug === oldSlug ? newSlug : slug)).join('/')
        : typeof child.path === 'string'
          ? child.path.split('/').map((slug: string) => (slug === oldSlug ? newSlug : slug)).join('/')
          : newSlug;

      await this.categoryRepository.updateById(child.id, {
        path: childPath,
      });

      await this.updateCategoryPathsRecursively(child.id, oldSlug, newSlug);
    }
  }

  async getRecentCategories(userId?: string, vendorId?: string): Promise<RecentCategory[]> {
    if (!userId && !vendorId) return [];

    let list: RecentCategory[] = [];

    // 1. If vendor or staff, retrieve from shared VendorProfile
    if (vendorId) {
      list = await this.categoryRepository.getRecentCategoriesForVendor(vendorId);
    }

    // 2. Fallback to UserPreference (e.g. for Admin/Superadmin or personal user preferences)
    if (list.length === 0 && userId) {
      list = await this.categoryRepository.getRecentCategoriesForUser(userId);
    }

    return list;
  }

  async recordRecentCategory(
    userId?: string,
    categoryId?: string,
    vendorId?: string,
  ): Promise<RecentCategory[]> {
    if (!categoryId) return [];
    if (!userId && !vendorId) return [];

    const category = await this.categoryRepository.findById(categoryId);
    if (!category) return [];

    const pathArr = Array.isArray(category.path)
      ? category.path
      : typeof category.path === 'string'
        ? [category.path]
        : [category.name];

    const newEntry: RecentCategory = {
      id: category.id,
      name: category.name,
      path: pathArr,
      usedAt: new Date().toISOString(),
    };

    const MAX_RECENT_CATEGORIES = 5;
    const existingRecent = await this.getRecentCategories(userId, vendorId);
    const updated = [
      newEntry,
      ...existingRecent.filter((item) => String(item.id) !== String(category.id)),
    ].slice(0, MAX_RECENT_CATEGORIES);

    // Save to VendorProfile so all vendor staff share recent categories
    if (vendorId) {
      await this.categoryRepository.saveRecentCategoriesForVendor(vendorId, updated);
    }

    // Also persist to UserPreference
    if (userId) {
      await this.categoryRepository.saveRecentCategoriesForUser(userId, updated);
    }

    return updated;
  }
}
