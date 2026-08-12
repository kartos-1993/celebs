import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { createComboSchema } from '@celebs/shared-types';
import { asyncHandler, HTTPSTATUS } from '@celebs/shared-utils';

import { authenticateJWT } from '../../middlewares/auth.middleware';
import { requirePermissions } from '../../middlewares/rbac.middleware';

import { ComboService } from './combo.service';

const router = Router();
const comboService = new ComboService();

// Public routes
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const tag = req.query.tag as string | undefined;
    const combos = await comboService.getActiveCombos(tag);
    res.status(HTTPSTATUS.OK).json({ success: true, data: combos });
  }),
);

router.get(
  '/all',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(async (_req, res) => {
    const combos = await comboService.getAllCombos();
    res.status(HTTPSTATUS.OK).json({ success: true, data: combos });
  }),
);

router.get(
  '/id/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id || '';
    const combo = await comboService.getComboById(id);
    if (!combo) {
      res.status(HTTPSTATUS.NOT_FOUND).json({ success: false, message: 'Combo not found' });
      return;
    }
    res.status(HTTPSTATUS.OK).json({ success: true, data: combo });
  }),
);

router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const slug = req.params.slug || '';
    const combo = await comboService.getComboBySlug(slug);
    if (!combo) {
      res.status(HTTPSTATUS.NOT_FOUND).json({ success: false, message: 'Combo not found' });
      return;
    }
    res.status(HTTPSTATUS.OK).json({ success: true, data: combo });
  }),
);

// Protected Admin routes
router.post(
  '/',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(async (req, res) => {
    const validatedPayload = createComboSchema.parse(req.body);
    const newCombo = await comboService.createCombo(validatedPayload);
    res.status(HTTPSTATUS.CREATED).json({ success: true, data: newCombo });
  }),
);

router.put(
  '/:id',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(async (req, res) => {
    const id = req.params.id || '';
    const updated = await comboService.updateCombo(id, req.body);
    res.status(HTTPSTATUS.OK).json({ success: true, data: updated });
  }),
);

router.delete(
  '/:id',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(async (req, res) => {
    const id = req.params.id || '';
    await comboService.deleteCombo(id);
    res.status(HTTPSTATUS.OK).json({ success: true, message: 'Combo deleted' });
  }),
);

export default router;
