import { Request, Response, NextFunction } from 'express';
import { CategoryService } from './category.service';
import { HTTPSTATUS, AppError, ErrorCode, logger } from '@celebs/shared-utils';
import { categoryInputSchema, categoryUpdateSchema } from '@/common/validators/category.validator';
import slugify from 'slugify';
import mongoose from 'mongoose';

export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  /**
   * Get all categories with populated attributes
   */
  getAllCategories = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const result = await this.categoryService.getAllCategories(page, limit);

      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Categories retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Search categories globally by name (case-insensitive)
   */
  searchCategories = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const q = (req.query.q as string) || '';
      const limit = req.query.limit ? parseInt(String(req.query.limit)) : 20;
      const results = await this.categoryService.searchCategories(q, limit);
      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Search results',
        data: results,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get category by ID with populated attributes
   */
  getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const category = await this.categoryService.getCategoryById(id);

      if (!category) {
        throw new AppError(
          'Category not found',
          HTTPSTATUS.NOT_FOUND,
          ErrorCode.CATEGORY_NOT_FOUND,
        );
      }

      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Category retrieved successfully',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create new category with attributes
   */
  createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Log the incoming request details for debugging
      logger.debug(
        {
          body: req.body,
          user: req.user,
        },
        'Create category request received',
      );

      const validatedData = categoryInputSchema.parse(req.body);
      const { name, parent, attributes, imageUrl } = validatedData;

      // Generate slug
      const slug = slugify(name, { lower: true, strict: true });
      let level = 1;
      let path: string[] = [];

      if (parent) {
        const parentCategory = await this.categoryService.getCategoryById(
          parent.toString(),
        );
        if (!parentCategory) {
          throw new AppError(
            'Parent category not found',
            HTTPSTATUS.NOT_FOUND,
            ErrorCode.CATEGORY_NOT_FOUND,
          );
        }
        level = parentCategory.level + 1;
        path = [...parentCategory.path.map((p) => p.toString()), name];
      } else {
        path = [name];
      }

      const categoryInput = {
        name,
        parent: parent?.toString() || null,
        slug,
        level,
        path,
        attributes: attributes || [],
        imageUrl: imageUrl || null,
      };

      const category = await this.categoryService.createCategory(categoryInput);

      return res.status(HTTPSTATUS.CREATED).json({
        success: true,
        message: 'Category created successfully',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete category by ID
   * This method will also handle cascading deletes if necessary
   */
  deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.categoryService.deleteCategoryWithCascade(id);
      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update category by ID
   */
  updateCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const validatedData = categoryUpdateSchema.parse(req.body);

      // Prepare update data
      const updateData: any = { ...validatedData };
      
      // If name is present, generate new slug
      if (updateData.name) {
        updateData.slug = slugify(updateData.name, {
          lower: true,
          strict: true,
        });
      }

      // If parent is present, convert to string or null
      if (updateData.parent !== undefined) {
        updateData.parent = updateData.parent
          ? updateData.parent.toString()
          : null;
      }

      const updatedCategory = await this.categoryService.updateCategory(
        id,
        updateData,
      );

      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Category updated successfully',
        data: updatedCategory,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get category tree with attributes
   * This method retrieves the entire category tree with their attributes
   */
  getCategoryTreeWithAttributes = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const tree = await this.categoryService.getCategoryTreeWithAttributes(activeOnly);
      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Category tree with attributes retrieved successfully',
        data: tree,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get filters for a specific category
   */
  getCategoryFilters = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id } = req.params;
      const filters = await this.categoryService.getCategoryFilters(id);
      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Category filters retrieved successfully',
        data: filters,
      });
    } catch (error) {
      next(error);
    }
  };
}
