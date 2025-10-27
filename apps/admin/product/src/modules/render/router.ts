import { Router } from 'express';
import { composeSchema } from './composer';
import { CategoryService } from '../category/category.service';

const router = Router();
const categoryService = new CategoryService();

const DEFAULT_POLICY = {
  media: {
    maxImages: 8,
    maxSizeBytes: 5 * 1024 * 1024,
  accept: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    minWidth: 1500,
    minHeight: 1500,
    aspectRatio: '1:1',
    ratioTolerance: 0.03,
  },
};

router.get('/product-render', async (req, res) => {
  try {
    const catId = String(req.query.catId || '');
    const locale = String(req.query.locale || 'en_US');
    if (!catId) return res.status(400).json({ error: 'catId is required' });

    const category = await categoryService.getCategoryById(catId);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const { fields, renderTag } = composeSchema({
      category: {
        _id: String((category as any)._id),
        name: (category as any).name,
        version: (category as any).version ?? 1,
        attributes: (category as any).attributes || [],
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
      return res.status(304).end();
    }
    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to compose render schema' });
  }
});

export default router;
