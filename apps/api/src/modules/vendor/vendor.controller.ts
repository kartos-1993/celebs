import { Request, Response } from 'express';

import {
  vendorBusinessInfoSchema,
  vendorDocumentsSchema,
  vendorProfileSchema,
  warehouseSchema,
} from '@celebs/shared-types';
import { asyncHandler, UnauthorizedException } from '@celebs/shared-utils';

import { VendorService } from './vendor.service';

import { sendSuccess } from '@/common/utils/response.util';

export class VendorController {
  private vendorService: VendorService;

  constructor(vendorService: VendorService) {
    this.vendorService = vendorService;
  }

  private getUserId(req: Request): string {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return userId;
  }

  public getOnboardingStatus = asyncHandler(
    async (req: Request, res: Response): Promise<Response> => {
      const userId = this.getUserId(req);
      const profile = await this.vendorService.getOnboardingStatus(userId);
      return sendSuccess(res, profile, 'Onboarding status retrieved successfully');
    },
  );

  public updateProfile = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const userId = this.getUserId(req);
    const body = vendorProfileSchema.parse(req.body);
    const profile = await this.vendorService.updateProfile(userId, body);
    return sendSuccess(res, profile, 'Vendor profile updated successfully');
  });

  public updateWarehouse = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const userId = this.getUserId(req);
    const body = warehouseSchema.parse(req.body);
    const profile = await this.vendorService.updateWarehouse(userId, body);
    return sendSuccess(res, profile, 'Vendor warehouse updated successfully');
  });

  public updateDocuments = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const userId = this.getUserId(req);
    const body = vendorDocumentsSchema.parse(req.body);
    const profile = await this.vendorService.updateDocuments(userId, body);
    return sendSuccess(res, profile, 'Vendor documents updated successfully');
  });

  public updateBusinessInfo = asyncHandler(
    async (req: Request, res: Response): Promise<Response> => {
      const userId = this.getUserId(req);
      const body = vendorBusinessInfoSchema.parse(req.body);
      const profile = await this.vendorService.updateBusinessInfo(userId, body);
      return sendSuccess(res, profile, 'Vendor business info updated successfully');
    },
  );

  public submitForReview = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const userId = this.getUserId(req);
    const profile = await this.vendorService.submitForReview(userId);
    return sendSuccess(res, profile, 'Vendor documents submitted for review');
  });

  public resubmitForReview = asyncHandler(
    async (req: Request, res: Response): Promise<Response> => {
      const userId = this.getUserId(req);
      const profile = await this.vendorService.resubmitForReview(userId);
      return sendSuccess(res, profile, 'Application resubmitted for review');
    },
  );

  public toggleHolidayMode = asyncHandler(
    async (req: Request, res: Response): Promise<Response> => {
      const userId = this.getUserId(req);
      const profile = await this.vendorService.toggleHolidayMode(userId);
      return sendSuccess(res, profile, 'Holiday mode toggled successfully');
    },
  );
}
