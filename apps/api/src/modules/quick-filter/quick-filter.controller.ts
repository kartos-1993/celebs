import { Request, Response } from 'express';

import { QuickFilterService } from './quick-filter.service';

import { sendCreated, sendSuccess } from '@/common/utils/response.util';

export class QuickFilterController {
  constructor(private readonly quickFilterService: QuickFilterService) {}

  getStorefrontConfig = async (req: Request, res: Response) => {
    const slug = req.params.slug || '';
    const data = await this.quickFilterService.getStorefrontConfigBySlug(slug);
    return sendSuccess(res, data, 'Storefront config retrieved successfully');
  };

  getQuickFiltersForCategory = async (req: Request, res: Response) => {
    const categoryId = req.params.categoryId || '';
    const data = await this.quickFilterService.getQuickFiltersForCategory(categoryId);
    return sendSuccess(res, data, 'Quick filters retrieved successfully');
  };

  createQuickFilter = async (req: Request, res: Response) => {
    const data = await this.quickFilterService.createQuickFilter(req.body);
    return sendCreated(res, data, 'Quick filter created successfully');
  };

  updateQuickFilter = async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const data = await this.quickFilterService.updateQuickFilter(id, req.body);
    return sendSuccess(res, data, 'Quick filter updated successfully');
  };

  deleteQuickFilter = async (req: Request, res: Response) => {
    const id = req.params.id || '';
    await this.quickFilterService.deleteQuickFilter(id);
    return sendSuccess(res, null, 'Quick filter deleted successfully');
  };
}
