import { Request, Response } from 'express';

import { createCampaignSchema, updateCampaignSchema } from '@celebs/shared-types';
import { asyncHandler, NotFoundException } from '@celebs/shared-utils';

import { CampaignService, campaignService } from './campaign.service';

import { sendCreated, sendSuccess } from '@/common/utils/response.util';

export class CampaignController {
  private svc: CampaignService;

  constructor(svc: CampaignService = campaignService) {
    this.svc = svc;
  }

  public getActiveCampaigns = asyncHandler(async (_req: Request, res: Response) => {
    const data = await this.svc.getActiveCampaigns();
    return sendSuccess(res, data, 'Active campaigns retrieved successfully');
  });

  public getAllCampaigns = asyncHandler(async (_req: Request, res: Response) => {
    const data = await this.svc.getAllCampaigns();
    return sendSuccess(res, data, 'All campaigns retrieved successfully');
  });

  public getCampaignById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const data = await this.svc.getCampaignById(id);
    if (!data) {
      throw new NotFoundException('Campaign not found');
    }
    return sendSuccess(res, data, 'Campaign details retrieved successfully');
  });

  public getCampaignBySlug = asyncHandler(async (req: Request, res: Response) => {
    const slug = req.params.slug || '';
    const data = await this.svc.getCampaignBySlug(slug);
    if (!data) {
      throw new NotFoundException('Campaign not found');
    }
    return sendSuccess(res, data, 'Campaign details retrieved successfully');
  });

  public createCampaign = asyncHandler(async (req: Request, res: Response) => {
    const validated = createCampaignSchema.parse(req.body);
    const data = await this.svc.createCampaign(validated);
    return sendCreated(res, data, 'Campaign created successfully');
  });

  public updateCampaign = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const validated = updateCampaignSchema.parse(req.body);
    const data = await this.svc.updateCampaign(id, validated);
    return sendSuccess(res, data, 'Campaign updated successfully');
  });
}

export const campaignController = new CampaignController();
