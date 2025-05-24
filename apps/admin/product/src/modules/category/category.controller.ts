import { Request, Response, NextFunction } from 'express';
import { CategoryService } from './category.service';
import { HTTPSTATUS } from '../../config/http.config';
import { AppError } from '../../common/utils/AppError';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { createCategorySchema ,updateCategorySchema} from '../../common/validators/category.validator';
import { logger } from '../../common/utils/logger';

export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  /**
   * Get all categories
   */
  getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      const result = await this.categoryService.getAllCategories(page, limit);
      
      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Categories retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get category by ID
   */
  getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const category = await this.categoryService.getCategoryById(id);
      
      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Category retrieved successfully',
        data: category
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create new category
   */  createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Log the incoming request details for debugging
      logger.debug({ 
        body: req.body,
        user: req.user,
        headers: req.headers,
        cookies: req.cookies
      }, 'Create category request received');
      
      const validatedData = createCategorySchema.parse(req.body);
        
      const category = await this.categoryService.createCategory(validatedData);
        
      return res.status(HTTPSTATUS.CREATED).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update category
   */
  updateCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const validatedData = updateCategorySchema.parse(req.body);
      const category = await this.categoryService.updateCategory(id, validatedData);
      
      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Category updated successfully',
        data: category
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete category
   */
  deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.categoryService.deleteCategory(id);
      
      return res.status(HTTPSTATUS.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  };
}
