import { NextFunction,Request, Response } from 'express';
import slugify from 'slugify';

import {
  createCategorySchema as categoryInputSchema,
  updateCategorySchema,
} from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS, logger } from '@celebs/shared-utils';

import { CategoryInput, CategoryService } from './category.service';

export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

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

      const categoryData = {
        name: validatedData.name,
        slug: slugify(validatedData.name, { lower: true, strict: true }),
        parent: validatedData.parent || null,
        attributes: validatedData.attributes || [],
      } as CategoryInput;

      const category = await this.categoryService.createCategory(categoryData);

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
      const id = req.params.id || '';
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
      const slug = req.params.slug || '';
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
      const id = req.params.id || '';
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
      const id = req.params.id || '';
      const validatedData = updateCategorySchema.parse(req.body);

      const updateData: Record<string, unknown> = { ...validatedData };

      if (updateData.name) {
        updateData.slug = slugify(updateData.name as string, {
          lower: true,
          strict: true,
        });
      }

      if (updateData.parent !== undefined) {
        updateData.parent = updateData.parent ? updateData.parent.toString() : null;
      }

      const updatedCategory = await this.categoryService.updateCategory(id, updateData);

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
      const slug = req.params.slug || '';
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
      const id = req.params.id || '';
      const attributes = req.body.attributes;
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
      const q = String(req.query.q || '');
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
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
      const id = req.params.id || '';
      const filters = await this.categoryService.getCategoryFilters(id);
      res.status(HTTPSTATUS.OK).json({
        success: true,
        data: filters,
      });
    } catch (error) {
      next(error);
    }
  };
}
