import { z } from 'zod';

import { baseCategorySchema } from '@celebs/shared-types';

import { withErrors } from './error.openapi';
import { registry } from './registry';

// Register Schemas
const createCategoryRequestSchema = registry.register('CreateCategoryRequest', baseCategorySchema);

const updateCategoryRequestSchema = registry.register(
  'UpdateCategoryRequest',
  baseCategorySchema.partial(),
);

// ── GET /categories ──
registry.registerPath({
  method: 'get',
  path: '/categories',
  tags: ['Categories'],
  summary: 'Get all active top-level categories',
  responses: {
    200: {
      description: 'List of categories',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(z.record(z.string(), z.any())),
          }),
        },
      },
    },
  },
});

// ── GET /categories/tree-with-attributes ──
registry.registerPath({
  method: 'get',
  path: '/categories/tree-with-attributes',
  tags: ['Categories'],
  summary: 'Get full hierarchical category tree with attributes and size charts',
  responses: {
    200: {
      description: 'Hierarchical category tree',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(z.record(z.string(), z.any())),
          }),
        },
      },
    },
  },
});

// ── GET /categories/search ──
registry.registerPath({
  method: 'get',
  path: '/categories/search',
  tags: ['Categories'],
  summary: 'Search categories by keyword',
  request: {
    query: z.object({
      q: z.string().describe('Search query'),
      limit: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Matching categories',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(z.record(z.string(), z.any())),
          }),
        },
      },
    },
    ...withErrors(400),
  },
});

// ── GET /categories/:id ──
registry.registerPath({
  method: 'get',
  path: '/categories/{id}',
  tags: ['Categories'],
  summary: 'Get category details by ID',
  request: {
    params: z.object({
      id: z.string().describe('Category UUID'),
    }),
  },
  responses: {
    200: {
      description: 'Category detail',
    },
    ...withErrors(404),
  },
});

// ── POST /categories ──
registry.registerPath({
  method: 'post',
  path: '/categories',
  tags: ['Categories'],
  summary: 'Create a new category (Admin)',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createCategoryRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Category created successfully',
    },
    ...withErrors(400, 401, 403),
  },
});

// ── PUT /categories/:id ──
registry.registerPath({
  method: 'put',
  path: '/categories/{id}',
  tags: ['Categories'],
  summary: 'Update category details (Admin)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: updateCategoryRequestSchema,
        },
      },
    },
  },
  responses: {
    200: { description: 'Category updated successfully' },
    ...withErrors(400, 401, 403, 404),
  },
});

// ── DELETE /categories/:id ──
registry.registerPath({
  method: 'delete',
  path: '/categories/{id}',
  tags: ['Categories'],
  summary: 'Delete a category (Admin)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: { description: 'Category deleted' },
    ...withErrors(401, 403, 404),
  },
});
