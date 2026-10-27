import { NextFunction, Request, Response } from 'express';

import {
  categoryIdParamSchema,
  categoryPaginationQuerySchema,
  categorySearchQuerySchema,
  categorySlugParamSchema,
  createCategorySchema as categoryInputSchema,
  recordRecentCategorySchema,
  updateCategoryAttributesSchema,
  updateCategorySchema,
} from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS, logger } from '@celebs/shared-utils';

import { CategoryService } from './category.service';

import { sendCreated, sendSuccess } from '@/common/utils/response.util';

export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  getAllCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit } = categoryPaginationQuerySchema.parse(req.query);

      const result = await this.categoryService.getAllCategories(page, limit);

      sendSuccess(res, result, 'Categories retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      logger.debug({ body: req.body, user: req.user }, 'Create category request received');
      const validatedData = categoryInputSchema.parse(req.body);

      const category = await this.categoryService.createCategory(validatedData);

      sendCreated(res, category, 'Category created successfully');
    } catch (error) {
      next(error);
    }
  };

  getCategoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = categoryIdParamSchema.parse(req.params);
      const category = await this.categoryService.getCategoryById(id);

      if (!category) {
        throw new AppError(
          'Category not found',
          HTTPSTATUS.NOT_FOUND,
          ErrorCode.RESOURCE_NOT_FOUND,
        );
      }

      sendSuccess(res, category, 'Category retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getCategoryBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { slug } = categorySlugParamSchema.parse(req.params);
      const category = await this.categoryService.getCategoryBySlug(slug);

      if (!category) {
        throw new AppError(
          'Category not found',
          HTTPSTATUS.NOT_FOUND,
          ErrorCode.RESOURCE_NOT_FOUND,
        );
      }

      sendSuccess(res, category, 'Category retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getCategoryTree = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tree = await this.categoryService.getCategoryTree();
      sendSuccess(res, tree, 'Category tree retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getCategoryTreeWithAttributes = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const tree = await this.categoryService.getCategoryTreeWithAttributes();
      sendSuccess(res, tree, 'Category tree with attributes retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = categoryIdParamSchema.parse(req.params);
      await this.categoryService.deleteCategoryWithCascade(id);
      sendSuccess(res, null, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = categoryIdParamSchema.parse(req.params);
      const validatedData = updateCategorySchema.parse(req.body);

      const updatedCategory = await this.categoryService.updateCategory(id, validatedData);

      sendSuccess(res, updatedCategory, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  };

  getStorefrontSchema = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { slug } = categorySlugParamSchema.parse(req.params);
      const schema = await this.categoryService.getStorefrontSchema(slug);
      sendSuccess(res, schema, 'Storefront schema retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateCategoryAttributes = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = categoryIdParamSchema.parse(req.params);
      const { attributes } = updateCategoryAttributesSchema.parse(req.body);
      const updated = await this.categoryService.updateCategoryAttributes(id, attributes);
      sendSuccess(res, updated, 'Category attributes updated successfully');
    } catch (error) {
      next(error);
    }
  };

  searchCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { q, limit } = categorySearchQuerySchema.parse(req.query);
      const results = await this.categoryService.searchCategories(q, limit);
      sendSuccess(res, results, 'Category search results retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getCategoryFilters = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = categoryIdParamSchema.parse(req.params);
      const filters = await this.categoryService.getCategoryFilters(id);
      sendSuccess(res, filters, 'Category filters retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getRecentCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.actor?.userId || req.user?.id || '';
      const vendorId =
        req.store?.id || req.user?.vendorProfile?.id || req.user?.vendorId || undefined;
      const recent = await this.categoryService.getRecentCategories(userId, vendorId);
      sendSuccess(res, recent, 'Recent categories retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  recordRecentCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.actor?.userId || req.user?.id || '';
      const vendorId =
        req.store?.id || req.user?.vendorProfile?.id || req.user?.vendorId || undefined;
      const { categoryId } = recordRecentCategorySchema.parse(req.body);
      const recent = await this.categoryService.recordRecentCategory(userId, categoryId, vendorId);
      sendSuccess(res, recent, 'Recent category updated');
    } catch (error) {
      next(error);
    }
  };
}
