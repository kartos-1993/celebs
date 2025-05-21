import { ProductService } from './product.service';
import { ProductController } from './product.controller';

export class ProductModule {
  private static instance: ProductModule;
  private productService: ProductService;
  private productController: ProductController;

  private constructor() {
    this.productService = new ProductService();
    this.productController = new ProductController(this.productService);
  }

  /**
   * Get singleton instance of ProductModule
   */
  static getInstance(): ProductModule {
    if (!ProductModule.instance) {
      ProductModule.instance = new ProductModule();
    }
    return ProductModule.instance;
  }

  /**
   * Get product service instance
   */
  getProductService(): ProductService {
    return this.productService;
  }

  /**
   * Get product controller instance
   */
  getProductController(): ProductController {
    return this.productController;
  }
}
