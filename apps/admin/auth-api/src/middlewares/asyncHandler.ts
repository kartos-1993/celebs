import { Request, Response, NextFunction } from 'express';

type AsyncControlerType = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;
