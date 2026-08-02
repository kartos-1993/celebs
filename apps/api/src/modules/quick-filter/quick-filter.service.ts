import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';
import { QuickFilterModel, IQuickFilter, QuickFilterType, QuickFilterDisplayAs } from '@/db/models/quick-filter.model';
import { CategoryModel } from '@/db/models/category.model';
import { CategoryFilterModel } from '@/db/models/category-filter.model';
import mongoose, { Types } from 'mongoose';

export interface CreateQuickFilterInput {
  categoryId: string;
  type: QuickFilterType;
  attributeId?: string | null;
  displayAs: QuickFilterDisplayAs;
  items?: {
    name: string;
    image?: string | null;
    slug?: string | null;
    filterValue?: string | null;
    displayOrder?: number;
  }[];
  autoPopulate?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateQuickFilterInput {
  type?: QuickFilterType;
  attributeId?: string | null;
  displayAs?: QuickFilterDisplayAs;
  items?: {
    name: string;
    image?: string | null;
    slug?: string | null;
    filterValue?: string | null;
    displayOrder?: number;
  }[];
  autoPopulate?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export class QuickFilterService {
  /**
   * Get storefront configuration (quick filters + drawer filters) for a category slug or ID
   */
  async getStorefrontConfigBySlug(slugOrId: string) {
    let category = null;

    const slugLower = slugOrId.toLowerCase();

    if (Types.ObjectId.isValid(slugOrId)) {
      category = await CategoryModel.findById(slugOrId).lean();
    }
    if (!category) {
      category = await CategoryModel.findOne({
        $or: [
          { slug: slugLower },
          { path: slugLower },
          { name: new RegExp(`^${slugLower.replace(/-/g, ' ')}$`, 'i') },
          { slug: new RegExp(slugLower.replace(/-/g, '.*'), 'i') },
          { name: new RegExp(slugLower.replace(/-/g, '|'), 'i') },
        ],
      }).lean();
    }

    if (!category) {
      throw new AppError('Category not found', HTTPSTATUS.NOT_FOUND, ErrorCode.CATEGORY_NOT_FOUND);
    }

    const categoryId = category._id;

    // 1. Fetch configured quick filters for this category
    let rawQuickFilters = await QuickFilterModel.find({
      categoryId,
      isActive: true,
    })
      .sort({ displayOrder: 1 })
      .lean();

    // Fallback: If no explicit quick filter is saved for this category, auto-generate default
    if (rawQuickFilters.length === 0) {
      const childCategories = await CategoryModel.find({
        parentCategory: categoryId,
        isActive: { $ne: false },
      })
        .sort({ name: 1 })
        .lean();

      if (childCategories.length > 0) {
        rawQuickFilters = [
          {
            _id: new mongoose.Types.ObjectId(),
            categoryId,
            type: 'subcategory' as QuickFilterType,
            attributeId: null,
            displayAs: 'avatar_scroll' as QuickFilterDisplayAs,
            items: childCategories.map((child, idx) => ({
              name: child.name.replace(new RegExp(`^${category.name}\\s+`, 'i'), ''),
              image: child.imageUrl || null,
              slug: child.slug,
              filterValue: child.slug,
              displayOrder: idx,
            })),
            autoPopulate: true,
            displayOrder: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
        ];
      }
    }

    const quickFilters = [];

    for (const qf of rawQuickFilters) {
      let finalItems = [...(qf.items || [])];

      // If subcategory type and autoPopulate is enabled, auto-fill from child categories
      if (qf.type === 'subcategory' && qf.autoPopulate) {
        const childCategories = await CategoryModel.find({
          parentCategory: categoryId,
          isActive: { $ne: false },
        })
          .sort({ name: 1 })
          .lean();

        if (childCategories.length > 0) {
          const autoItems = childCategories.map((child, idx) => ({
            name: child.name.replace(new RegExp(`^${category.name}\\s+`, 'i'), ''),
            image: child.imageUrl || null,
            slug: child.slug,
            filterValue: child.slug,
            displayOrder: idx,
          }));

          // Merge or replace: if no manual items, use autoItems
          if (finalItems.length === 0) {
            finalItems = autoItems;
          }
        }
      }

      quickFilters.push({
        _id: String(qf._id),
        type: qf.type,
        attributeId: qf.attributeId ? String(qf.attributeId) : null,
        displayAs: qf.displayAs,
        displayOrder: qf.displayOrder,
        items: finalItems,
      });
    }

    // 2. Fetch drawer filters configured in CategoryFilterModel
    const rawDrawerFilters = await CategoryFilterModel.find({ categoryId })
      .populate('attributeId')
      .sort({ displayOrder: 1 })
      .lean();

    const drawerFilters = rawDrawerFilters.map((df: any) => {
      const attr = df.attributeId || {};
      return {
        _id: String(df._id),
        name: df.displayName || attr.name || 'Filter',
        uiType: df.uiType || 'checkbox',
        attributeId: attr._id ? String(attr._id) : null,
        attributeName: attr.name || null,
        values: Array.isArray(attr.values) ? attr.values : [],
        isMultiSelect: df.isMultiSelect !== false,
        displayOrder: df.displayOrder || 0,
      };
    });

    return {
      category: {
        _id: String(category._id),
        name: category.name,
        slug: category.slug,
        level: category.level,
        imageUrl: category.imageUrl || null,
      },
      quickFilters,
      drawerFilters,
    };
  }

  /**
   * Get all quick filters for a category (Admin)
   */
  async getQuickFiltersForCategory(categoryId: string) {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new AppError('Invalid category ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }
    return await QuickFilterModel.find({ categoryId }).sort({ displayOrder: 1 });
  }

  /**
   * Create a quick filter configuration (Admin)
   */
  async createQuickFilter(input: CreateQuickFilterInput): Promise<IQuickFilter> {
    if (!Types.ObjectId.isValid(input.categoryId)) {
      throw new AppError('Invalid category ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    const category = await CategoryModel.findById(input.categoryId);
    if (!category) {
      throw new AppError('Category not found', HTTPSTATUS.NOT_FOUND, ErrorCode.CATEGORY_NOT_FOUND);
    }

    return await QuickFilterModel.create({
      categoryId: new mongoose.Types.ObjectId(input.categoryId),
      type: input.type,
      attributeId: input.attributeId && Types.ObjectId.isValid(input.attributeId)
        ? new mongoose.Types.ObjectId(input.attributeId)
        : null,
      displayAs: input.displayAs,
      items: input.items || [],
      autoPopulate: input.autoPopulate !== false,
      displayOrder: input.displayOrder || 0,
      isActive: input.isActive !== false,
    });
  }

  /**
   * Update a quick filter configuration (Admin)
   */
  async updateQuickFilter(id: string, input: UpdateQuickFilterInput): Promise<IQuickFilter> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid quick filter ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    const updated = await QuickFilterModel.findByIdAndUpdate(
      id,
      { $set: input },
      { new: true, runValidators: true },
    );

    if (!updated) {
      throw new AppError('Quick filter not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    return updated;
  }

  /**
   * Delete a quick filter configuration (Admin)
   */
  async deleteQuickFilter(id: string): Promise<{ success: boolean }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid quick filter ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    const deleted = await QuickFilterModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new AppError('Quick filter not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    return { success: true };
  }
}
