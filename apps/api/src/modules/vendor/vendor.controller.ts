import { Request, Response } from 'express';
import { asyncHandler, HTTPSTATUS, UnauthorizedException } from '@celebs/shared-utils';
import { VendorService } from './vendor.service';
import {
  vendorProfileSchema,
  warehouseSchema,
  vendorDocumentsSchema,
  vendorBusinessInfoSchema,
  IApiResponse,
} from '@celebs/shared-types';

export class VendorController {
  private vendorService: VendorService;

  constructor(vendorService: VendorService) {
    this.vendorService = vendorService;
  }

  private getUserId(req: Request): string {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return userId;
  }

  public getOnboardingStatus = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const userId = this.getUserId(req);
    const profile = await this.vendorService.getOnboardingStatus(userId);
    const response: IApiResponse<typeof profile> = {
      success: true,
      message: 'Onboarding status retrieved successfully',
      data: profile,
    };
    return res.status(HTTPSTATUS.OK).json(response);
  });

  public updateProfile = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const userId = this.getUserId(req);
    const body = vendorProfileSchema.parse(req.body);
    const profile = await this.vendorService.updateProfile(userId, body);
    const response: IApiResponse<typeof profile> = {
      success: true,
      message: 'Vendor profile updated successfully',
      data: profile,
    };
    return res.status(HTTPSTATUS.OK).json(response);
  });

  public updateWarehouse = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const userId = this.getUserId(req);
    const body = warehouseSchema.parse(req.body);
    const profile = await this.vendorService.updateWarehouse(userId, body);
    const response: IApiResponse<typeof profile> = {
      success: true,
      message: 'Vendor warehouse updated successfully',
      data: profile,
    };
    return res.status(HTTPSTATUS.OK).json(response);
  });

  public updateDocuments = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const userId = this.getUserId(req);
    const body = vendorDocumentsSchema.parse(req.body);
    const profile = await this.vendorService.updateDocuments(userId, body);
    const response: IApiResponse<typeof profile> = {
      success: true,
      message: 'Vendor documents updated successfully',
      data: profile,
    };
    return res.status(HTTPSTATUS.OK).json(response);
  });

  public updateBusinessInfo = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const userId = this.getUserId(req);
    const body = vendorBusinessInfoSchema.parse(req.body);
    const profile = await this.vendorService.updateBusinessInfo(userId, body);
    const response: IApiResponse<typeof profile> = {
      success: true,
      message: 'Vendor business info updated successfully',
      data: profile,
    };
    return res.status(HTTPSTATUS.OK).json(response);
  });

  public submitForReview = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const userId = this.getUserId(req);
    const profile = await this.vendorService.submitForReview(userId);
    const response: IApiResponse<typeof profile> = {
      success: true,
      message: 'Vendor documents submitted for review',
      data: profile,
    };
    return res.status(HTTPSTATUS.OK).json(response);
  });

  public toggleHolidayMode = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const userId = this.getUserId(req);
    const profile = await this.vendorService.toggleHolidayMode(userId);
    const response: IApiResponse<typeof profile> = {
      success: true,
      message: 'Holiday mode toggled successfully',
      data: profile,
    };
    return res.status(HTTPSTATUS.OK).json(response);
  });
}
