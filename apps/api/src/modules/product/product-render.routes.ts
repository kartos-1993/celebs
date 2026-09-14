import { Router } from 'express';

import { asyncHandler, BadRequestException, NotFoundException } from '@celebs/shared-utils';

import { composeSchema } from './schema-composer';

import { sendSuccess } from '@/common/utils/response.util';
import { CategoryService } from '@/modules/category/category.service';

const router = Router();
const categoryService = new CategoryService();

const DEFAULT_POLICY = {
  media: {
    maxImages: 8,
    maxSizeBytes: 5 * 1024 * 1024,
    accept: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    maxWidth: 2000,
    maxHeight: 2000,
  },
};

router.get(
  '/product-render',
  asyncHandler(async (req, res) => {
    const catId = String(req.query.catId || '');
    const locale = String(req.query.locale || 'en_US');
    if (!catId) {
      throw new BadRequestException('catId is required');
    }

    const category = await categoryService.getCategoryById(catId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const { fields, renderTag } = await composeSchema({
      category: {
        id: String(category.id),
        name: category.name,
        version: 1,
        attributes: category.attributes || [],
        sizeChartColumns: category.sizeChartColumns || [],
        bodyChartColumns: category.bodyChartColumns || [],
      },
      locale,
      policy: DEFAULT_POLICY,
    });

    res.setHeader('ETag', renderTag);
    if (req.headers['if-none-match'] === renderTag) {
      res.status(304).end();
      return;
    }

    return sendSuccess(
      res,
      { fields, renderTag, catId },
      'Product render schema composed successfully',
    );
  }),
);

export default router;
