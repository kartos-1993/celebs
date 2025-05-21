import { Request, Response, NextFunction } from 'express';
import { ProductService } from './product.service';
import { HTTPSTATUS } from '../../config/http.config';
import { AppError } from '../../common/utils/AppError';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { validateCreateProduct, validateUpdateProduct, validateUpdateStock } from '../../common/validators/product.validation';

export class ProductController {
  constructor(private productService: ProductService) {}

  /**
   * Get all products with filtering and pagination
   */
  getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const sort = req.query.sort as string || '-createdAt';
      
      // Extract filter parameters
      const filters: Record<string, any> = {};
      
      // Handle common filters
      if (req.query.name) filters.name = req.query.name;
      if (req.query.category) filters.category = req.query.category;
      if (req.query.subcategory) filters.subcategory = req.query.subcategory;
      if (req.query.minPrice) filters.minPrice = req.query.minPrice;
      if (req.query.maxPrice) filters.maxPrice = req.query.maxPrice;
      if (req.query.inStock === 'true') filters.inStock = true;
      
      const result = await this.productService.getAllProducts(filters, page, limit, sort);
      
      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Products retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get product by ID
   */
  getProductById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const product = await this.productService.getProductById(id);
      
      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Product retrieved successfully',
        data: product
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create new product
   */
  createProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = validateCreateProduct(req.body);
      
      if (!validatedData.success) {
        throw new AppError(
          validatedData.error.message,
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.VALIDATION_ERROR
        );
      }
      
      const product = await this.productService.createProduct(validatedData.data);
      
      return res.status(HTTPSTATUS.CREATED).json({
        success: true,
        message: 'Product created successfully',
        data: product
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update product
   */
  updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const validatedData = validateUpdateProduct(req.body);
      
      if (!validatedData.success) {
        throw new AppError(
          validatedData.error.message,
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.VALIDATION_ERROR
        );
      }
      
      const product = await this.productService.updateProduct(id, validatedData.data);
      
      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Product updated successfully',
        data: product
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete product
   */
  deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.productService.deleteProduct(id);
      
      return res.status(HTTPSTATUS.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update product stock
   */
  updateProductStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const validatedData = validateUpdateStock(req.body);
      
      if (!validatedData.success) {
        throw new AppError(
          validatedData.error.message,
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.VALIDATION_ERROR
        );
      }
      
      // We need to adapt from our schema structure to the service method
      const { colorVariantName, stocks } = validatedData.data;
      
      // For now, let's handle the first stock item in the array
      // In a real implementation, we might want to handle multiple stock updates
      if (stocks && stocks.length > 0) {
        const { size, quantity } = stocks[0];
        
        const product = await this.productService.updateProductStock(
          id,
          colorVariantName, // Using colorVariantName as colorId
          size,            // Using size as sizeId
          quantity         // Quantity from the stock item
        );
        
        return res.status(HTTPSTATUS.OK).json({
          success: true,
          message: 'Product stock updated successfully',
          data: product
        });
      } else {
        throw new AppError(
          'No stock items provided',
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.VALIDATION_ERROR
        );
      }
    } catch (error) {
      next(error);
    }
  };
}
