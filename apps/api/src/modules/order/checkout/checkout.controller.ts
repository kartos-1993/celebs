import { Request, Response } from 'express';

import { checkoutSchema } from '@celebs/shared-types';

import { CheckoutService,checkoutService } from './checkout.service';

import { sendCreated } from '@/common/utils/response.util';

export class CheckoutController {
  constructor(private service: CheckoutService = checkoutService) {}

  checkout = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const validated = checkoutSchema.parse(req.body);
    const result = await this.service.checkout(userId, validated, req.get('host'));
    return sendCreated(res, result, 'Order placed successfully');
  };
}

export const checkoutController = new CheckoutController();
