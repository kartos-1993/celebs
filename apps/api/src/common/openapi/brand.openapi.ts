import { z } from 'zod';

import {
  createBrandAuthorizationSchema,
  createBrandSchema,
  reviewBrandAuthorizationSchema,
} from '@celebs/shared-types';

import { withErrors } from './error.openapi';
import { registry } from './registry';

// Register Schemas
const brandCreateSchema = registry.register('CreateBrandRequest', createBrandSchema);
const brandAuthRequestSchema = registry.register(
  'CreateBrandAuthorizationRequest',
  createBrandAuthorizationSchema,
);
const reviewAuthRequestSchema = registry.register(
  'ReviewBrandAuthorizationRequest',
  reviewBrandAuthorizationSchema,
);

// ── GET /brands ──
registry.registerPath({
  method: 'get',
  path: '/brands',
  tags: ['Brands'],
  summary: 'List active brands (Storefront & Catalog)',
  request: {
    query: z.object({
      search: z.string().optional(),
      tier: z.enum(['FIRST_PARTY', 'GATED_GLOBAL', 'REGISTERED_VENDOR', 'OPEN_GENERIC']).optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'List of brands',
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

// ── GET /brands/:id ──
registry.registerPath({
  method: 'get',
  path: '/brands/{id}',
  tags: ['Brands'],
  summary: 'Get brand profile by ID or slug',
  request: {
    params: z.object({
      id: z.string().describe('Brand UUID or URL slug'),
    }),
  },
  responses: {
    200: { description: 'Brand details' },
    ...withErrors(404),
  },
});

// ── POST /brands/authorizations ──
registry.registerPath({
  method: 'post',
  path: '/brands/authorizations',
  tags: ['Brands'],
  summary: 'Apply for seller brand selling authorization (Letter of Authorization)',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: brandAuthRequestSchema,
        },
      },
    },
  },
  responses: {
    201: { description: 'Authorization request submitted' },
    ...withErrors(400, 401, 403),
  },
});

// ── GET /brands/authorizations/my ──
registry.registerPath({
  method: 'get',
  path: '/brands/authorizations/my',
  tags: ['Brands'],
  summary: 'Get current seller brand authorization requests and status',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Seller brand authorizations' },
    ...withErrors(401),
  },
});

// ── GET /brands/admin/authorizations ──
registry.registerPath({
  method: 'get',
  path: '/brands/admin/authorizations',
  tags: ['Brands'],
  summary: 'Get all pending brand authorizations across vendors (Admin)',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'List of pending authorizations' },
    ...withErrors(401, 403),
  },
});

// ── PATCH /brands/admin/authorizations/:id ──
registry.registerPath({
  method: 'patch',
  path: '/brands/admin/authorizations/{id}',
  tags: ['Brands'],
  summary: 'Approve, reject, or revoke brand authorization (Admin)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: reviewAuthRequestSchema,
        },
      },
    },
  },
  responses: {
    200: { description: 'Authorization review status updated' },
    ...withErrors(400, 401, 403, 404),
  },
});

// ── POST /brands/admin ──
registry.registerPath({
  method: 'post',
  path: '/brands/admin',
  tags: ['Brands'],
  summary: 'Create brand registry entry (Platform Admin)',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: brandCreateSchema,
        },
      },
    },
  },
  responses: {
    201: { description: 'Brand created' },
    ...withErrors(400, 401, 403),
  },
});
