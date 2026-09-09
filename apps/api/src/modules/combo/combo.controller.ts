import { Request, Response } from 'express';

import { createComboSchema, updateComboSchema } from '@celebs/shared-types';
import { asyncHandler, NotFoundException } from '@celebs/shared-utils';

import { ComboService, comboService } from './combo.service';

import { sendCreated, sendSuccess } from '@/common/utils/response.util';

export class ComboController {
  private svc: ComboService;

  constructor(svc: ComboService = comboService) {
    this.svc = svc;
  }

  public getActiveCombos = asyncHandler(async (req: Request, res: Response) => {
    const tag = req.query.tag as string | undefined;
    const data = await this.svc.getActiveCombos(tag);
    return sendSuccess(res, data, 'Active combos retrieved successfully');
  });

  public getAllCombos = asyncHandler(async (_req: Request, res: Response) => {
    const data = await this.svc.getAllCombos();
    return sendSuccess(res, data, 'All combos retrieved successfully');
  });

  public getComboById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const data = await this.svc.getComboById(id);
    if (!data) {
      throw new NotFoundException('Combo not found');
    }
    return sendSuccess(res, data, 'Combo details retrieved successfully');
  });

  public getComboBySlug = asyncHandler(async (req: Request, res: Response) => {
    const slug = req.params.slug || '';
    const data = await this.svc.getComboBySlug(slug);
    if (!data) {
      throw new NotFoundException('Combo not found');
    }
    return sendSuccess(res, data, 'Combo details retrieved successfully');
  });

  public createCombo = asyncHandler(async (req: Request, res: Response) => {
    const validated = createComboSchema.parse(req.body);
    const data = await this.svc.createCombo(validated);
    return sendCreated(res, data, 'Combo created successfully');
  });

  public updateCombo = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const validated = updateComboSchema.parse(req.body);
    const data = await this.svc.updateCombo(id, validated);
    return sendSuccess(res, data, 'Combo updated successfully');
  });

  public deleteCombo = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const data = await this.svc.deleteCombo(id);
    return sendSuccess(res, data, 'Combo deleted successfully');
  });
}

export const comboController = new ComboController();
