import { Router } from 'express';
import { composeSchema } from './schema-composer';
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

router.get('/product-render', async (req, res) => {
  try {
    const catId = String(req.query.catId || '');
    const locale = String(req.query.locale || 'en_US');
    if (!catId) {
      res.status(400).json({ error: 'catId is required' });
      return;
    }

    const category = await categoryService.getCategoryById(catId);
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    const { fields, renderTag } = await composeSchema({
      category: {
        id: String(category.id),
        name: category.name,
        version: category.version ?? 1,
        attributes: (category.attributes as any) || [],
        sizeChartColumns: category.sizeChartColumns || [],
      },
      locale,
      policy: DEFAULT_POLICY,
    });

    const payload = {
      api: 'product.render',
      v: '1.0',
      data: { data: fields, extra: {}, ignore: false },
      ret: ['SUCCESS::OK'],
      value: { render_tag: renderTag, renderTimestamp: Date.now(), catId },
    };

    res.setHeader('ETag', renderTag);
    if (req.headers['if-none-match'] === renderTag) {
      res.status(304).end();
      return;
    }
    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to compose render schema' });
  }
});

export default router;
