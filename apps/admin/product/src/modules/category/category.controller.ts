import { Request, Response, NextFunction } from 'express';
import { CategoryService } from './category.service';
import { HTTPSTATUS } from '../../config/http.config';
import { AppError } from '../../common/utils/AppError';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { categoryInputSchema } from '../../common/validators/category.validator';
import { logger } from '../../common/utils/logger';
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
   */ createCategory = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
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
      const { name, parent, attributes } = validatedData;

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
        path = [...parentCategory.path.map((p) => p.toString()), slug];
      } else {
        path = [slug];
      }

      const categoryInput = {
        name,
        parent: parent?.toString() || null,
        slug,
        level,
        path,
        attributes: attributes || [],
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

  // Additional methods can go here...
}
