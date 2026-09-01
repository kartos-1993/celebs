import { Request, Response } from 'express';

import { createCampaignSchema, IApiResponse, updateCampaignSchema } from '@celebs/shared-types';
import { asyncHandler, HTTPSTATUS, NotFoundException } from '@celebs/shared-utils';

import { CampaignService, campaignService } from './campaign.service';

export class CampaignController {
  private svc: CampaignService;

  constructor(svc: CampaignService = campaignService) {
    this.svc = svc;
  }

  public getActiveCampaigns = asyncHandler(async (_req: Request, res: Response) => {
    const data = await this.svc.getActiveCampaigns();
    const response: IApiResponse<typeof data> = {
      success: true,
      message: 'Active campaigns retrieved successfully',
      data,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public getAllCampaigns = asyncHandler(async (_req: Request, res: Response) => {
    const data = await this.svc.getAllCampaigns();
    const response: IApiResponse<typeof data> = {
      success: true,
      message: 'All campaigns retrieved successfully',
      data,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public getCampaignById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const data = await this.svc.getCampaignById(id);
    if (!data) {
      throw new NotFoundException('Campaign not found');
    }
    const response: IApiResponse<typeof data> = {
      success: true,
      message: 'Campaign details retrieved successfully',
      data,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public getCampaignBySlug = asyncHandler(async (req: Request, res: Response) => {
    const slug = req.params.slug || '';
    const data = await this.svc.getCampaignBySlug(slug);
    if (!data) {
      throw new NotFoundException('Campaign not found');
    }
    const response: IApiResponse<typeof data> = {
      success: true,
      message: 'Campaign details retrieved successfully',
      data,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public createCampaign = asyncHandler(async (req: Request, res: Response) => {
    const validated = createCampaignSchema.parse(req.body);
    const data = await this.svc.createCampaign(validated);
    const response: IApiResponse<typeof data> = {
      success: true,
      message: 'Campaign created successfully',
      data,
    };
    res.status(HTTPSTATUS.CREATED).json(response);
  });

  public updateCampaign = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const validated = updateCampaignSchema.parse(req.body);
    const data = await this.svc.updateCampaign(id, validated);
    const response: IApiResponse<typeof data> = {
      success: true,
      message: 'Campaign updated successfully',
      data,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });
}

export const campaignController = new CampaignController();
