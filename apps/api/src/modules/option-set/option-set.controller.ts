import { Request, Response } from 'express';

import { createOptionSetSchema, IApiResponse, updateOptionSetSchema } from '@celebs/shared-types';
import { asyncHandler, HTTPSTATUS, NotFoundException } from '@celebs/shared-utils';

import { type OptionSetService, optionSetService } from './option-set.service';

export class OptionSetController {
  private svc: OptionSetService;

  constructor(svc: OptionSetService = optionSetService) {
    this.svc = svc;
  }

  public list = asyncHandler(async (req: Request, res: Response) => {
    const type = (req.query.type as string | undefined) || undefined;
    const data = await this.svc.list(type);
    const response: IApiResponse<typeof data> = {
      success: true,
      message: 'Option sets retrieved successfully',
      data,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public getById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const data = await this.svc.getById(id);
    if (!data) {
      throw new NotFoundException('Option set not found');
    }
    const response: IApiResponse<typeof data> = {
      success: true,
      message: 'Option set retrieved successfully',
      data,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public create = asyncHandler(async (req: Request, res: Response) => {
    const validated = createOptionSetSchema.parse(req.body);
    const data = await this.svc.create(validated);
    const response: IApiResponse<typeof data> = {
      success: true,
      message: 'Option set created successfully',
      data,
    };
    res.status(HTTPSTATUS.CREATED).json(response);
  });

  public update = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const validated = updateOptionSetSchema.parse(req.body);
    const data = await this.svc.update(id, validated);
    const response: IApiResponse<typeof data> = {
      success: true,
      message: 'Option set updated successfully',
      data,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });

  public delete = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const data = await this.svc.delete(id);
    const response: IApiResponse<typeof data> = {
      success: true,
      message: 'Option set deleted successfully',
      data,
    };
    res.status(HTTPSTATUS.OK).json(response);
  });
}

export const optionSetController = new OptionSetController();
