import { NextFunction, Request, Response } from 'express';

import { can, Permission } from '@celebs/rbac';
import {
  createProductSchema,
  idParamSchema,
  productFilterSchema,
  productReviewActionSchema,
  updateProductSchema,
} from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { ProductService } from './product.service';
import { PRODUCT_STATUS } from './product-status';

import { isPlatformActor } from '@/common/context/actor-context';

export class ProductController {
  constructor(private readonly productService: ProductService) {}

  createProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = req.actor;
      if (!actor) {
        throw new AppError(
          'Authentication is required to create products',
          HTTPSTATUS.UNAUTHORIZED,
          ErrorCode.AUTH_TOKEN_MISSING,
        );
      }

      const payload = createProductSchema.parse(req.body);
      const isPublisher = can(
        actor.role as Parameters<typeof can>[0],
        Permission.PRODUCT_PUBLISH,
        actor.permissions,
      );

      // Non-publisher accounts (Vendors, Staff without explicit publish permission) cannot publish directly
      let initialStatus = payload.status;
      if (!isPublisher && initialStatus === PRODUCT_STATUS.PUBLISHED) {
        initialStatus = PRODUCT_STATUS.PENDING_REVIEW;
      }

      // Sellers are pre-validated by requireStoreState(['APPROVED']).
      // Platform actors act under Celebs 1P: storeId stays null.
      const effectiveVendorId = req.store?.id ?? null;
      const effectiveVendorName = req.store?.shopName;

      const product = await this.productService.createProduct(
        {
          ...payload,
          status: initialStatus,
        },
        actor.userId,
        effectiveVendorId,
        effectiveVendorName,
      );

      res.status(HTTPSTATUS.CREATED).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  getProductById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const product = await this.productService.getProductById(id);
      if (!product) {
        throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
      }

      const isPublished =
        product.status === 'published' ||
        String(product.status).toLowerCase() === PRODUCT_STATUS.PUBLISHED;
      if (!isPublished) {
        // Default-deny: only platform reviewers and the owning store may read
        // unpublished products. Anonymous/customers get 404 (no existence leak).
        const actor = req.actor;
        const isReviewer =
          !!actor &&
          can(
            actor.role as Parameters<typeof can>[0],
            Permission.PRODUCT_REVIEW,
            actor.permissions,
          );
        const ownsIt = !!req.store?.id && String(product.vendorId) === String(req.store.id);
        if (!isReviewer && !ownsIt) {
          throw new AppError(
            'Product not found',
            HTTPSTATUS.NOT_FOUND,
            ErrorCode.PRODUCT_NOT_FOUND,
          );
        }
      }

      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Product retrieved successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  getProducts = async (req: Request, res: Response, next: NextFunction) => {
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

      // Tenant isolation: requests explicitly from admin management surfaces
      // carrying a store context are strictly scoped to that store.
      // Storefront browsing (mobile & customer web) browses the full marketplace catalog.
      const isStoreManagement = req.headers['x-surface'] === 'admin' || req.query.manage === 'true';
      if (req.store && isStoreManagement) {
        filters.vendorId = req.store.id;
      }

      const result = await this.productService.getProducts(filters);

      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Products retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  submitProductForReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.store?.id;
      if (!storeId) {
        throw new AppError(
          'This operation requires a seller store context',
          HTTPSTATUS.FORBIDDEN,
          ErrorCode.SELLER_CONTEXT_REQUIRED,
        );
      }

      const { id } = idParamSchema.parse(req.params);
      const product = await this.productService.submitProductForReview(id, storeId);

      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Product submitted for review successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  reviewProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = req.actor;
      if (!actor) {
        throw new AppError(
          'Authentication required',
          HTTPSTATUS.UNAUTHORIZED,
          ErrorCode.AUTH_TOKEN_MISSING,
        );
      }

      const { id } = idParamSchema.parse(req.params);
      const parsed = productReviewActionSchema.parse(req.body);
      const product = await this.productService.reviewProduct(id, {
        action: parsed.action,
        reviewerId: actor.userId,
        reviewerName: actor.email || 'Superadmin',
        note: parsed.note,
        rejectionCategory: parsed.rejectionCategory,
        rejectionSubcategories: parsed.rejectionSubcategories,
        rejectionFields: parsed.rejectionFields,
      });

      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: `Product ${parsed.action}ed successfully`,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = req.actor;
      if (!actor) {
        throw new AppError(
          'Authentication required',
          HTTPSTATUS.UNAUTHORIZED,
          ErrorCode.AUTH_TOKEN_MISSING,
        );
      }

      const { id } = idParamSchema.parse(req.params);
      const payload = updateProductSchema.parse(req.body);
      const effectiveVendorId = req.store?.id;

      const product = await this.productService.updateProduct(
        id,
        payload,
        actor.userId,
        actor.role,
        effectiveVendorId,
        actor.permissions,
      );

      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Product updated successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  archiveProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = req.actor;
      if (!actor) {
        throw new AppError(
          'Authentication required',
          HTTPSTATUS.UNAUTHORIZED,
          ErrorCode.AUTH_TOKEN_MISSING,
        );
      }

      const { id } = idParamSchema.parse(req.params);
      const effectiveVendorId = req.store?.id;

      const product = await this.productService.archiveProduct(
        id,
        actor.userId,
        actor.role,
        effectiveVendorId,
      );

      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Product archived successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  toggleProductActivation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.store?.id;
      if (!storeId && !isPlatformActor(req.actor)) {
        throw new AppError(
          'This operation requires a seller store context',
          HTTPSTATUS.FORBIDDEN,
          ErrorCode.SELLER_CONTEXT_REQUIRED,
        );
      }
      if (!storeId) {
        throw new AppError(
          'Vendor profile not found',
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.INVALID_REQUEST,
        );
      }

      const { id } = idParamSchema.parse(req.params);
      const product = await this.productService.toggleProductActivation(id, storeId);

      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: `Product successfully ${product?.status === PRODUCT_STATUS.PUBLISHED ? 'activated' : 'deactivated'}`,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  getProductReviewQueue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const result = await this.productService.getProductReviewQueue(page, limit);
      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Product review queue retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
