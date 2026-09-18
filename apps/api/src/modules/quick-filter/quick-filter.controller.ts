import { Request, Response } from 'express';

import {
  createQuickFilterSchema,
  quickFilterCategoryParamSchema,
  quickFilterIdParamSchema,
  quickFilterSlugParamSchema,
  updateQuickFilterSchema,
} from '@celebs/shared-types';

import { QuickFilterService } from './quick-filter.service';

import { sendCreated, sendSuccess } from '@/common/utils/response.util';

export class QuickFilterController {
  constructor(private readonly quickFilterService: QuickFilterService) {}

  getStorefrontConfig = async (req: Request, res: Response) => {
    const { slug } = quickFilterSlugParamSchema.parse(req.params);
    const data = await this.quickFilterService.getStorefrontConfigBySlug(slug);
    return sendSuccess(res, data, 'Storefront config retrieved successfully');
  };

  getQuickFiltersForCategory = async (req: Request, res: Response) => {
    const { categoryId } = quickFilterCategoryParamSchema.parse(req.params);
    const data = await this.quickFilterService.getQuickFiltersForCategory(categoryId);
    return sendSuccess(res, data, 'Quick filters retrieved successfully');
  };

  createQuickFilter = async (req: Request, res: Response) => {
    const body = createQuickFilterSchema.parse(req.body);
    const data = await this.quickFilterService.createQuickFilter(body);
    return sendCreated(res, data, 'Quick filter created successfully');
  };

  updateQuickFilter = async (req: Request, res: Response) => {
    const { id } = quickFilterIdParamSchema.parse(req.params);
    const body = updateQuickFilterSchema.parse(req.body);
    const data = await this.quickFilterService.updateQuickFilter(id, body);
    return sendSuccess(res, data, 'Quick filter updated successfully');
  };

  deleteQuickFilter = async (req: Request, res: Response) => {
    const { id } = quickFilterIdParamSchema.parse(req.params);
    await this.quickFilterService.deleteQuickFilter(id);
    return sendSuccess(res, null, 'Quick filter deleted successfully');
  };
}
