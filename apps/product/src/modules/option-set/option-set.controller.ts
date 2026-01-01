import { Request, Response, NextFunction } from 'express';
import { OptionSetService } from './option-set.service';
import { HTTPSTATUS } from '../../config/http.config';

export class OptionSetController {
  constructor(private svc: OptionSetService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = (req.query.type as 'color' | 'size' | undefined) || undefined;
      const data = await this.svc.list(type);
      res.status(HTTPSTATUS.OK).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = await this.svc.getById(id);
      if (!data) return res.status(404).json({ success: false, message: 'Option set not found' });
      res.status(HTTPSTATUS.OK).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}
