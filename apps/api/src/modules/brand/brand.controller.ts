import { NextFunction, Request, Response } from 'express';

import {
  brandFilterSchema,
  createBrandAuthorizationSchema,
  createBrandSchema,
  getBrandAuthorizationsQuerySchema,
  getBrandParamSchema,
  idParamSchema,
  paginationQuerySchema,
  reviewBrandAuthorizationSchema,
  updateBrandSchema,
} from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS, logger } from '@celebs/shared-utils';

import { BrandService, brandService as defaultBrandService } from './brand.service';

import { isPlatformActor } from '@/common/context/actor-context';
import { sendCreated, sendSuccess } from '@/common/utils/response.util';

export class BrandController {
  constructor(private brandService: BrandService = defaultBrandService) {}

  getAllBrands = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = brandFilterSchema.parse(req.query);
      const result = await this.brandService.getBrands(filters);

      return sendSuccess(res, result, 'Brands retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getBrandByIdOrSlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: idOrSlug } = getBrandParamSchema.parse(req.params);
      const brand = await this.brandService.getBrandByIdOrSlug(idOrSlug);

      if (!brand) {
        throw new AppError('Brand not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
      }

      return sendSuccess(res, brand, 'Brand retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  createBrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.debug({ body: req.body, user: req.user }, 'Create brand request received');
      const validatedData = createBrandSchema.parse(req.body);
      const brand = await this.brandService.createBrand(validatedData);

      return sendCreated(res, brand, 'Brand created successfully');
    } catch (error) {
      next(error);
    }
  };

  updateBrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const validatedData = updateBrandSchema.parse(req.body);
      const brand = await this.brandService.updateBrand(id, validatedData);

      return sendSuccess(res, brand, 'Brand updated successfully');
    } catch (error) {
      next(error);
    }
  };

  submitAuthorization = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.store?.id;
      if (!storeId) {
        throw new AppError(
          'This operation requires a seller store context',
          HTTPSTATUS.FORBIDDEN,
          ErrorCode.SELLER_CONTEXT_REQUIRED,
        );
      }

      const validatedData = createBrandAuthorizationSchema.parse(req.body);
      const auth = await this.brandService.submitAuthorization(storeId, validatedData);

      return sendCreated(res, auth, 'Brand authorization submitted for review');
    } catch (error) {
      next(error);
    }
  };

  getMyAuthorizations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.store?.id;
      if (!storeId) {
        if (req.actor && isPlatformActor(req.actor)) {
          const { vendorId } = getBrandAuthorizationsQuerySchema.parse(req.query);
          const auths = vendorId ? await this.brandService.getVendorAuthorizations(vendorId) : [];

          return sendSuccess(res, auths, 'Brand authorizations retrieved successfully');
        }

        throw new AppError(
          'This operation requires a seller store context',
          HTTPSTATUS.FORBIDDEN,
          ErrorCode.SELLER_CONTEXT_REQUIRED,
        );
      }

      const auths = await this.brandService.getVendorAuthorizations(storeId);

      return sendSuccess(res, auths, 'Seller brand authorizations retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getPendingAuthorizations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = paginationQuerySchema.parse(req.query);
      const result = await this.brandService.getPendingAuthorizations(page, limit);

      return sendSuccess(res, result, 'Pending brand authorizations retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  reviewAuthorization = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const adminUserId = req.actor?.userId;
      if (!adminUserId) {
        throw new AppError(
          'Authentication required',
          HTTPSTATUS.UNAUTHORIZED,
          ErrorCode.AUTH_TOKEN_MISSING,
        );
      }
      const validatedData = reviewBrandAuthorizationSchema.parse(req.body);
      const auth = await this.brandService.reviewAuthorization(id, adminUserId, validatedData);

      return sendSuccess(
        res,
        auth,
        `Brand authorization ${validatedData.status.toLowerCase()} successfully`,
      );
    } catch (error) {
      next(error);
    }
  };
}

export const brandController = new BrandController();
