import { z } from 'zod';

import { baseProductSchema } from '@celebs/shared-types';

import { withErrors } from './error.openapi';
import { registry } from './registry';

// Register Schemas
const createProductRequestSchema = registry.register('CreateProductRequest', baseProductSchema);

const updateProductRequestSchema = registry.register(
  'UpdateProductRequest',
  baseProductSchema.partial(),
);

// ── GET /products ──
registry.registerPath({
  method: 'get',
  path: '/products',
  tags: ['Products'],
  summary: 'List and search products (Storefront)',
  request: {
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      search: z.string().optional(),
      categoryId: z.string().optional(),
      brandId: z.string().optional(),
      minPrice: z.string().optional(),
      maxPrice: z.string().optional(),
      sort: z.enum(['price_asc', 'price_desc', 'newest', 'rating']).optional(),
    }),
  },
  responses: {
    200: {
      description: 'Paginated product list',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(z.record(z.string(), z.any())),
            meta: z.object({
              page: z.number(),
              limit: z.number(),
              total: z.number(),
              totalPages: z.number(),
            }),
          }),
        },
      },
    },
  },
});

// ── GET /products/:id ──
registry.registerPath({
  method: 'get',
  path: '/products/{id}',
  tags: ['Products'],
  summary: 'Get single product details by ID or Slug',
  request: {
    params: z.object({
      id: z.string().describe('Product UUID or URL slug'),
    }),
  },
  responses: {
    200: {
      description: 'Product details',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.record(z.string(), z.any()),
          }),
        },
      },
    },
    ...withErrors(404),
  },
});

// ── GET /products/review-product-queue ──
registry.registerPath({
  method: 'get',
  path: '/products/review-product-queue',
  tags: ['Products'],
  summary: 'Get product moderation queue (Admin/Reviewer)',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Products awaiting review',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(z.record(z.string(), z.any())),
          }),
        },
      },
    },
    ...withErrors(401, 403),
  },
});

// ── POST /products ──
registry.registerPath({
  method: 'post',
  path: '/products',
  tags: ['Products'],
  summary: 'Create a new product (Vendor/Admin)',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createProductRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Product successfully created',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.record(z.string(), z.any()),
          }),
        },
      },
    },
    ...withErrors(400, 401, 403),
  },
});

// ── PUT /products/:id ──
registry.registerPath({
  method: 'put',
  path: '/products/{id}',
  tags: ['Products'],
  summary: 'Update an existing product',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().describe('Product UUID'),
    }),
    body: {
      content: {
        'application/json': {
          schema: updateProductRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Product updated successfully',
    },
    ...withErrors(400, 401, 403, 404),
  },
});

// ── POST /products/:id/submit-for-review ──
registry.registerPath({
  method: 'post',
  path: '/products/{id}/submit-for-review',
  tags: ['Products'],
  summary: 'Submit draft product to platform moderation queue',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: { description: 'Product submitted for review' },
    ...withErrors(401, 403, 404),
  },
});

// ── POST /products/:id/review ──
registry.registerPath({
  method: 'post',
  path: '/products/{id}/review',
  tags: ['Products'],
  summary: 'Review and approve/reject a product (Admin)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            action: z.enum(['APPROVE', 'REJECT']),
            feedback: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: 'Product review recorded' },
    ...withErrors(400, 401, 403, 404),
  },
});

// ── POST /products/:id/archive ──
registry.registerPath({
  method: 'post',
  path: '/products/{id}/archive',
  tags: ['Products'],
  summary: 'Archive a product',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: { description: 'Product archived' },
    ...withErrors(401, 403, 404),
  },
});

// ── POST /products/:id/toggle-activation ──
registry.registerPath({
  method: 'post',
  path: '/products/{id}/toggle-activation',
  tags: ['Products'],
  summary: 'Toggle product active/inactive state',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: { description: 'Product activation state toggled' },
    ...withErrors(401, 403, 404),
  },
});
