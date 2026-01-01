import { Router } from 'express';
import { OptionSetService } from './option-set.service';
import { OptionSetController } from './option-set.controller';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { authenticateJWT } from '../../middlewares/auth.middleware';
import { config } from '../../config/app.config';

const router = Router();
const controller = new OptionSetController(new OptionSetService());

// Protect in production; keep open in dev/staging to simplify admin UI wiring
if (config.NODE_ENV === 'production') {
	router.use(authenticateJWT);
}

router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getById));

export default router;
