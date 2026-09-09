import { Request, Response } from 'express';

import { createOptionSetSchema, updateOptionSetSchema } from '@celebs/shared-types';
import { asyncHandler, NotFoundException } from '@celebs/shared-utils';

import { type OptionSetService, optionSetService } from './option-set.service';

import { sendCreated, sendSuccess } from '@/common/utils/response.util';

export class OptionSetController {
  private svc: OptionSetService;

  constructor(svc: OptionSetService = optionSetService) {
    this.svc = svc;
  }

  public list = asyncHandler(async (req: Request, res: Response) => {
    const type = (req.query.type as string | undefined) || undefined;
    const data = await this.svc.list(type);
    return sendSuccess(res, data, 'Option sets retrieved successfully');
  });

  public getById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const data = await this.svc.getById(id);
    if (!data) {
      throw new NotFoundException('Option set not found');
    }
    return sendSuccess(res, data, 'Option set retrieved successfully');
  });

  public create = asyncHandler(async (req: Request, res: Response) => {
    const validated = createOptionSetSchema.parse(req.body);
    const data = await this.svc.create(validated);
    return sendCreated(res, data, 'Option set created successfully');
  });

  public update = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const validated = updateOptionSetSchema.parse(req.body);
    const data = await this.svc.update(id, validated);
    return sendSuccess(res, data, 'Option set updated successfully');
  });

  public delete = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id || '';
    const data = await this.svc.delete(id);
    return sendSuccess(res, data, 'Option set deleted successfully');
  });
}

export const optionSetController = new OptionSetController();
