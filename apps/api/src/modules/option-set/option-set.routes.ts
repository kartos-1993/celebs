import { Router } from 'express';

import { asyncHandler } from '@celebs/shared-utils';

import { OptionSetController } from './option-set.controller';
import { OptionSetService } from './option-set.service';

import { config } from '@/config/app.config';
import { authenticateJWT } from '@/middlewares/auth.middleware';

const router = Router();
const controller = new OptionSetController(new OptionSetService());

// Protect in production; keep open in dev/staging to simplify admin UI wiring
if (config.NODE_ENV === 'production') {
  router.use(authenticateJWT);
}

router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getById));
router.post('/', asyncHandler(controller.create));
router.put('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.delete));

export default router;
