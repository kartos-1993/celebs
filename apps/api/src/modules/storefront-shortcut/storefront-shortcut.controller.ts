import { Request, Response } from 'express';

import { StorefrontShortcutService } from './storefront-shortcut.service';

import { sendCreated, sendSuccess } from '@/common/utils/response.util';

export class StorefrontShortcutController {
  constructor(private readonly storefrontShortcutService: StorefrontShortcutService) {}

  getStorefrontConfig = async (req: Request, res: Response) => {
    const slug = req.params.slug || '';
    const data = await this.storefrontShortcutService.getStorefrontConfigBySlug(slug);
    return sendSuccess(res, data, 'Storefront config retrieved successfully');
  };

  getStorefrontShortcutsForCategory = async (req: Request, res: Response) => {
    const categoryId = String(req.query.categoryId ?? '');
    const data = await this.storefrontShortcutService.getStorefrontShortcutsForCategory(categoryId);
    return sendSuccess(res, data, 'Storefront shortcuts retrieved successfully');
  };

  createStorefrontShortcut = async (req: Request, res: Response) => {
    const data = await this.storefrontShortcutService.createStorefrontShortcut(req.body);
    return sendCreated(res, data, 'Storefront shortcut created successfully');
  };

  updateStorefrontShortcut = async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const data = await this.storefrontShortcutService.updateStorefrontShortcut(id, req.body);
    return sendSuccess(res, data, 'Storefront shortcut updated successfully');
  };

  deleteStorefrontShortcut = async (req: Request, res: Response) => {
    const id = req.params.id || '';
    await this.storefrontShortcutService.deleteStorefrontShortcut(id);
    return sendSuccess(res, null, 'Storefront shortcut deleted successfully');
  };
}
