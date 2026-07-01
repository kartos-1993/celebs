import { ProductController } from './product.controller';
import { ProductService } from './product.service';

export class ProductModule {
  private static instance: ProductModule;
  private readonly productService: ProductService;
  private readonly productController: ProductController;

  private constructor() {
    this.productService = new ProductService();
    this.productController = new ProductController(this.productService);
  }

  static getInstance(): ProductModule {
    if (!ProductModule.instance) {
      ProductModule.instance = new ProductModule();
    }

    return ProductModule.instance;
  }

  getProductController(): ProductController {
    return this.productController;
  }
}
