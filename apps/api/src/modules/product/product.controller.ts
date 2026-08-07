import { NextFunction, Request, Response } from 'express';
import {
  createProductSchema,
  updateProductSchema,
  productReviewActionSchema,
  productFilterSchema,
} from '@/common/validators/product.validator';
import { ErrorCode, AppError, HTTPSTATUS } from '@celebs/shared-utils';
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
      const isVendor = req.user.role === 'VENDOR';
      
      // If vendor, we set status to pending_review directly if they hit submit, 
      // but creation payload by default sets draft. Service handles default input.status.
      const product = await this.productService.createProduct(
        payload,
        req.user.userId,
        req.user.vendorProfile?.id,
        req.user.vendorProfile?.shopName,
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

  getProductById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const product = await this.productService.getProductById(req.params.id);
      if (!product) {
        throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
      }

      // Allow viewing published products publicly for everyone (storefront + mobile).
      // For draft or unpublished products, restrict viewing to the owner vendor or admin.
      const isPublished = product.status === 'published' || (product.status as string) === 'PUBLISHED';
      if (!isPublished && req.user?.role === 'VENDOR') {
        const vendorId = req.user.vendorProfile?.id;
        if (String(product.vendorId) !== String(vendorId)) {
          throw new AppError('Forbidden: You do not own this unpublished product', HTTPSTATUS.FORBIDDEN, ErrorCode.FORBIDDEN_RESOURCE);
        }
      }

      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Product retrieved successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  getProducts = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const cursor = req.query.cursor ? (req.query.cursor as string) : undefined;
      
      const filters = productFilterSchema.parse({
        ...req.query,
        cursor,
        page,
        limit,
      });

      if (req.query.vendorOnly === 'true' && req.user?.vendorProfile?.id) {
        filters.vendorId = req.user.vendorProfile.id;
      }
      const result = await this.productService.getAllProducts(filters, page, limit);

      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Products retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getProductReviewQueue = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const result = await this.productService.getProductReviewQueue(page, limit);

      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Product review queue retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  submitProductForReview = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const vendorId = req.user?.vendorProfile?.id;
      if (!vendorId) {
        throw new AppError('Vendor profile not found', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
      }

      const product = await this.productService.submitProductForReview(req.params.id, vendorId);

      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Product submitted for review successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  reviewProduct = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user?.userId) {
        throw new AppError('Authentication required', HTTPSTATUS.UNAUTHORIZED, ErrorCode.AUTH_TOKEN_MISSING);
      }

      const parsed = productReviewActionSchema.parse(req.body);
      const product = await this.productService.reviewProduct(
        req.params.id,
        {
          action: parsed.action,
          reviewerId: req.user.userId,
          reviewerName: (req.user as any)?.email || 'Superadmin',
          note: parsed.note,
          rejectionCategory: parsed.rejectionCategory,
          rejectionSubcategories: parsed.rejectionSubcategories,
          rejectionFields: parsed.rejectionFields,
        }
      );

      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: `Product ${parsed.action}ed successfully`,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  updateProduct = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user?.userId) {
        throw new AppError('Authentication required', HTTPSTATUS.UNAUTHORIZED, ErrorCode.AUTH_TOKEN_MISSING);
      }

      const payload = updateProductSchema.parse(req.body);
      const product = await this.productService.updateProduct(
        req.params.id,
        payload,
        req.user.userId,
        req.user.role || '',
        req.user.vendorProfile?.id,
      );

      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Product updated successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  archiveProduct = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user?.userId) {
        throw new AppError('Authentication required', HTTPSTATUS.UNAUTHORIZED, ErrorCode.AUTH_TOKEN_MISSING);
      }

      const product = await this.productService.archiveProduct(
        req.params.id,
        req.user.userId,
        req.user.role || '',
        req.user.vendorProfile?.id,
      );

      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Product archived successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  toggleProductActivation = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const vendorId = req.user?.vendorProfile?.id;
      if (!vendorId) {
        throw new AppError('Vendor profile not found', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
      }

      const product = await this.productService.toggleProductActivation(req.params.id, vendorId);

      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: `Product successfully ${product.status === 'published' ? 'activated' : 'deactivated'}`,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };
}
