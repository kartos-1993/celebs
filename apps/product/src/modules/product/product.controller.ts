import { NextFunction, Request, Response } from 'express';
import { createProductSchema } from '../../common/validators/product.validator';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppError } from '../../common/utils/AppError';
import { HTTPSTATUS } from '../../config/http.config';
import { ProductService } from './product.service';

export class ProductController {
  constructor(private readonly productService: ProductService) {}

  createProduct = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user?.userId) {
        throw new AppError(
          'Authentication is required to create products',
          HTTPSTATUS.UNAUTHORIZED,
          ErrorCode.AUTH_TOKEN_MISSING,
        );
      }

      const payload = createProductSchema.parse(req.body);
      const product = await this.productService.createProduct(
        payload,
        req.user.userId,
      );

      return res.status(HTTPSTATUS.CREATED).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };
}
