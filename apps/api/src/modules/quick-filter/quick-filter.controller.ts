import { Request, Response } from 'express';
import { QuickFilterService } from './quick-filter.service';
import { HTTPSTATUS } from '@celebs/shared-utils';

export class QuickFilterController {
  constructor(private readonly quickFilterService: QuickFilterService) {}

  getStorefrontConfig = async (req: Request, res: Response) => {
    const slug = req.params.slug;
    const data = await this.quickFilterService.getStorefrontConfigBySlug(slug);
    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: 'Storefront config retrieved successfully',
      data,
    });
  };

  getQuickFiltersForCategory = async (req: Request, res: Response) => {
    const categoryId = req.params.categoryId;
    const data = await this.quickFilterService.getQuickFiltersForCategory(categoryId);
    return res.status(HTTPSTATUS.OK).json({
      success: true,
      data,
    });
  };

  createQuickFilter = async (req: Request, res: Response) => {
    const data = await this.quickFilterService.createQuickFilter(req.body);
    return res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: 'Quick filter created successfully',
      data,
    });
  };

  updateQuickFilter = async (req: Request, res: Response) => {
    const id = req.params.id;
    const data = await this.quickFilterService.updateQuickFilter(id, req.body);
    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: 'Quick filter updated successfully',
      data,
    });
  };

  deleteQuickFilter = async (req: Request, res: Response) => {
    const id = req.params.id;
    await this.quickFilterService.deleteQuickFilter(id);
    return res.status(HTTPSTATUS.OK).json({
      success: true,
      message: 'Quick filter deleted successfully',
    });
  };
}
