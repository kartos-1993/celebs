import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';

export class CategoryModule {
  private static instance: CategoryModule;
  private categoryService: CategoryService;
  private categoryController: CategoryController;

  private constructor() {
    this.categoryService = new CategoryService();
    this.categoryController = new CategoryController(this.categoryService);
  }

  /**
   * Get singleton instance of CategoryModule
   */
  static getInstance(): CategoryModule {
    if (!CategoryModule.instance) {
      CategoryModule.instance = new CategoryModule();
    }
    return CategoryModule.instance;
  }

  /**
   * Get category service instance
   */
  getCategoryService(): CategoryService {
    return this.categoryService;
  }

  /**
   * Get category controller instance
   */
  getCategoryController(): CategoryController {
    return this.categoryController;
  }
}