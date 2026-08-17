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

export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = categoryPaginationQuerySchema.parse(req.query);

      const result = await this.categoryService.getAllCategories(page, limit);

      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Categories retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.debug({ body: req.body, user: req.user }, 'Create category request received');
      const validatedData = categoryInputSchema.parse(req.body);

      const category = await this.categoryService.createCategory(validatedData);

      res.status(HTTPSTATUS.CREATED).json({
        success: true,
        message: 'Category created successfully',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  };

  getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
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

      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Category retrieved successfully',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  };

  getCategoryBySlug = async (req: Request, res: Response, next: NextFunction) => {
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

      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Category retrieved successfully',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  };

  getCategoryTree = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const tree = await this.categoryService.getCategoryTree();
      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Category tree retrieved successfully',
        data: tree,
      });
    } catch (error) {
      next(error);
    }
  };

  getCategoryTreeWithAttributes = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const tree = await this.categoryService.getCategoryTreeWithAttributes();
      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Category tree with attributes retrieved successfully',
        data: tree,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = categoryIdParamSchema.parse(req.params);
      await this.categoryService.deleteCategoryWithCascade(id);
      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  updateCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = categoryIdParamSchema.parse(req.params);
      const validatedData = updateCategorySchema.parse(req.body);

      const updatedCategory = await this.categoryService.updateCategory(id, validatedData);

      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Category updated successfully',
        data: updatedCategory,
      });
    } catch (error) {
      next(error);
    }
  };

  getStorefrontSchema = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = categorySlugParamSchema.parse(req.params);
      const schema = await this.categoryService.getStorefrontSchema(slug);
      res.status(HTTPSTATUS.OK).json({
        success: true,
        data: schema,
      });
    } catch (error) {
      next(error);
    }
  };

  updateCategoryAttributes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = categoryIdParamSchema.parse(req.params);
      const { attributes } = updateCategoryAttributesSchema.parse(req.body);
      const updated = await this.categoryService.updateCategoryAttributes(id, attributes);
      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Category attributes updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

  searchCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, limit } = categorySearchQuerySchema.parse(req.query);
      const results = await this.categoryService.searchCategories(q, limit);
      res.status(HTTPSTATUS.OK).json({
        success: true,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  };

  getCategoryFilters = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = categoryIdParamSchema.parse(req.params);
      const filters = await this.categoryService.getCategoryFilters(id);
      res.status(HTTPSTATUS.OK).json({
        success: true,
        data: filters,
      });
    } catch (error) {
      next(error);
    }
  };

  getRecentCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id || '';
      const vendorId = req.user?.vendorProfile?.id || req.user?.vendorId;
      const recent = await this.categoryService.getRecentCategories(userId, vendorId);
      res.status(HTTPSTATUS.OK).json({
        success: true,
        data: recent,
      });
    } catch (error) {
      next(error);
    }
  };

  recordRecentCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id || '';
      const vendorId = req.user?.vendorProfile?.id || req.user?.vendorId;
      const { categoryId } = recordRecentCategorySchema.parse(req.body);
      const recent = await this.categoryService.recordRecentCategory(userId, categoryId, vendorId);
      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Recent category updated',
        data: recent,
      });
    } catch (error) {
      next(error);
    }
  };
}
