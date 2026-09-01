import { Request, Response } from 'express';

import { createComboSchema, IApiResponse, updateComboSchema } from '@celebs/shared-types';
import { asyncHandler, HTTPSTATUS, NotFoundException } from '@celebs/shared-utils';

import { ComboService, comboService } from './combo.service';

export class ComboController {
  private svc: ComboService;

  constructor(svc: ComboService = comboService) {
    this.svc = svc;
  }

  public getActiveCombos = asyncHandler(async (req: Request, res: Response) => {
    const tag = req.query.tag as string | undefined;
    const data = await this.svc.getActiveCombos(tag);
    const response: IApiResponse<typeof data> = {
      success: true,
      message: 'Active combos retrieved successfully',
      data,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public getAllCombos = asyncHandler(async (_req: Request, res: Response) => {
    const data = await this.svc.getAllCombos();
    const response: IApiResponse<typeof data> = {
      success: true,
      message: 'All combos retrieved successfully',
      data,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public getComboById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const data = await this.svc.getComboById(id);
    if (!data) {
      throw new NotFoundException('Combo not found');
    }
    const response: IApiResponse<typeof data> = {
      success: true,
      message: 'Combo details retrieved successfully',
      data,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public getComboBySlug = asyncHandler(async (req: Request, res: Response) => {
    const slug = req.params.slug || '';
    const data = await this.svc.getComboBySlug(slug);
    if (!data) {
      throw new NotFoundException('Combo not found');
    }
    const response: IApiResponse<typeof data> = {
      success: true,
      message: 'Combo details retrieved successfully',
      data,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public createCombo = asyncHandler(async (req: Request, res: Response) => {
    const validated = createComboSchema.parse(req.body);
    const data = await this.svc.createCombo(validated);
    const response: IApiResponse<typeof data> = {
      success: true,
      message: 'Combo created successfully',
      data,
    };
    res.status(HTTPSTATUS.CREATED).json(response);
  });

  public updateCombo = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const validated = updateComboSchema.parse(req.body);
    const data = await this.svc.updateCombo(id, validated);
    const response: IApiResponse<typeof data> = {
      success: true,
      message: 'Combo updated successfully',
      data,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public deleteCombo = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const data = await this.svc.deleteCombo(id);
    const response: IApiResponse<typeof data> = {
      success: true,
      message: 'Combo deleted successfully',
      data,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });
}

export const comboController = new ComboController();
