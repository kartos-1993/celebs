import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { can, Permission } from '@celebs/rbac';
import {
  createProductSchema,
  idParamSchema,
  PRODUCT_STATUS,
  productFilterSchema,
  productReviewActionSchema,
  updateProductSchema,
} from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { ProductService } from './product.service';

import { isPlatformActor } from '@/common/context/actor-context';
import { resolveTargetStoreId } from '@/common/guards/store.guards';
import { sendCreated, sendSuccess } from '@/common/utils/response.util';

/**
 * Review-queue pagination DTO. Coerces repeated/garbage query values to safe
 * integers so `?page=abc` can never reach the service as NaN. Mirrors the
 * productFilterSchema page/limit contract (1-based page, max 100 per page).
 */
const productReviewQueueQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(10),
});

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

      // the fix (controller thinning): the non-publisher PUBLISHED→PENDING_REVIEW
      // downgrade and the platform (1P) store fallback now live in
      // ProductService.createProduct, so every entry point shares one rule.
      // The controller only forwards request context; it decides nothing.
      const product = await this.productService.createProduct(
        payload,
        actor.userId,
        resolveTargetStoreId(req, 'body'),
        req.store?.shopName,
        actor.role,
        actor.permissions,
      );

      sendCreated(res, product, 'Product created successfully');
    } catch (error) {
      next(error);
    }
  };

  getProductById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const actor = req.actor;
      const isElevated =
        isPlatformActor(actor) ||
        (!!actor &&
          can(
            actor.role as Parameters<typeof can>[0],
            Permission.PRODUCT_REVIEW,
            actor.permissions,
          ));

      const product = await this.productService.getProductById(id, isElevated);
      if (!product) {
        throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
      }

      const isPublished = product.status === PRODUCT_STATUS.PUBLISHED;
      if (!isPublished) {
        // Default-deny: only platform reviewers and the owning store may read unpublished products
        const ownsIt = !!req.store?.id && String(product.vendorId) === String(req.store.id);
        if (!isElevated && !ownsIt) {
          throw new AppError(
            'Product not found',
            HTTPSTATUS.NOT_FOUND,
            ErrorCode.PRODUCT_NOT_FOUND,
          );
        }
      }

      sendSuccess(res, product, 'Product retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Delegate all query parsing & coercion strictly to Zod schema (prevents NaN leak C1)
      const filters = productFilterSchema.parse(req.query);

      const isStoreManagement = req.headers['x-surface'] === 'admin' || req.query.manage === 'true';

      const result = await this.productService.getProducts(filters, {
        actor: req.actor,
        storeId: req.store?.id,
        isStoreManagement,
      });

      // C10: Send caching headers for public storefront browse
      const isElevated = isPlatformActor(req.actor);
      if (!isElevated && !req.headers.authorization) {
        res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
      }

      sendSuccess(res, result, 'Products retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  submitProductForReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isPlatform = isPlatformActor(req.actor);
      const storeId = req.store?.id;
      if (!storeId && !isPlatform) {
        throw new AppError(
          'This operation requires a seller store context',
          HTTPSTATUS.FORBIDDEN,
          ErrorCode.SELLER_CONTEXT_REQUIRED,
        );
      }

      const { id } = idParamSchema.parse(req.params);
      const product = await this.productService.submitProductForReview(id, storeId, isPlatform);

      sendSuccess(res, product, 'Product submitted for review successfully');
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

      sendSuccess(res, product, `Product ${parsed.action}ed successfully`);
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

      sendSuccess(res, product, 'Product updated successfully');
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

      sendSuccess(res, product, 'Product archived successfully');
    } catch (error) {
      next(error);
    }
  };

  toggleProductActivation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isPlatform = isPlatformActor(req.actor);
      const storeId = req.store?.id;
      if (!storeId && !isPlatform) {
        throw new AppError(
          'This operation requires a seller store context',
          HTTPSTATUS.FORBIDDEN,
          ErrorCode.SELLER_CONTEXT_REQUIRED,
        );
      }

      const { id } = idParamSchema.parse(req.params);
      const product = await this.productService.toggleProductActivation(id, storeId, isPlatform);

      sendSuccess(
        res,
        product,
        `Product successfully ${product?.status === PRODUCT_STATUS.PUBLISHED ? 'activated' : 'deactivated'}`,
      );
    } catch (error) {
      next(error);
    }
  };

  getProductReviewQueue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // the fix (controller thinning): page/limit coercion + clamping moved into
      // the shared-types schema, so the controller no longer hand-parses query
      // strings (or can leak NaN into the service).
      const { page, limit } = productReviewQueueQuerySchema.parse(req.query);
      const result = await this.productService.getProductReviewQueue(page, limit);
      sendSuccess(res, result, 'Product review queue retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}
