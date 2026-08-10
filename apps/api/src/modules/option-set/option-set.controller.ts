import { Request, Response, NextFunction } from 'express';
import { OptionSetService } from './option-set.service';
import { HTTPSTATUS } from '@celebs/shared-utils';

export class OptionSetController {
  constructor(private svc: OptionSetService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = (req.query.type as string | undefined) || undefined;
      const data = await this.svc.list(type);
      res.status(HTTPSTATUS.OK).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id || '';
      const data = await this.svc.getById(id);
      if (!data) {
        res.status(HTTPSTATUS.NOT_FOUND).json({ success: false, message: 'Option set not found' });
        return;
      }
      res.status(HTTPSTATUS.OK).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, displayName, description, values } = req.body;
      if (!name) {
        res
          .status(HTTPSTATUS.BAD_REQUEST)
          .json({ success: false, message: 'Option set name is required' });
        return;
      }
      const data = await this.svc.create({ name, displayName, description, values });
      res.status(HTTPSTATUS.CREATED).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id || '';
      const { name, displayName, description, values } = req.body;
      const data = await this.svc.update(id, { name, displayName, description, values });
      res.status(HTTPSTATUS.OK).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id || '';
      const data = await this.svc.delete(id);
      res.status(HTTPSTATUS.OK).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}
