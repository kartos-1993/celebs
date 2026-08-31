import { z } from 'zod';

import { addToCartSchema, syncCartSchema, updateCartItemSchema } from '@celebs/shared-types';

import { withErrors } from './error.openapi';
import { registry } from './registry';

// Register Schemas
const addToCartReqSchema = registry.register('AddToCartRequest', addToCartSchema);
const updateCartItemReqSchema = registry.register('UpdateCartItemRequest', updateCartItemSchema);
const syncCartReqSchema = registry.register('SyncCartRequest', syncCartSchema);

// ── GET /cart ──
registry.registerPath({
  method: 'get',
  path: '/cart',
  tags: ['Cart'],
  summary: 'Retrieve user or guest session shopping cart',
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  responses: {
    200: {
      description: 'Cart contents with subtotal and items',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.record(z.string(), z.any()),
          }),
        },
      },
    },
  },
});

// ── POST /cart/items ──
registry.registerPath({
  method: 'post',
  path: '/cart/items',
  tags: ['Cart'],
  summary: 'Add item variant to cart',
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: addToCartReqSchema,
        },
      },
    },
  },
  responses: {
    200: { description: 'Item added to cart' },
    ...withErrors(400),
  },
});

// ── PATCH /cart/items/:itemId ──
registry.registerPath({
  method: 'patch',
  path: '/cart/items/{itemId}',
  tags: ['Cart'],
  summary: 'Update item quantity in cart',
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({ itemId: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: updateCartItemReqSchema,
        },
      },
    },
  },
  responses: {
    200: { description: 'Cart item quantity updated' },
    ...withErrors(400, 404),
  },
});

// ── DELETE /cart/items/:itemId ──
registry.registerPath({
  method: 'delete',
  path: '/cart/items/{itemId}',
  tags: ['Cart'],
  summary: 'Remove an item from cart',
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({ itemId: z.string() }),
  },
  responses: {
    200: { description: 'Item removed from cart' },
    ...withErrors(404),
  },
});

// ── DELETE /cart ──
registry.registerPath({
  method: 'delete',
  path: '/cart',
  tags: ['Cart'],
  summary: 'Clear all items in cart',
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  responses: {
    200: { description: 'Cart cleared' },
  },
});

// ── POST /cart/sync ──
registry.registerPath({
  method: 'post',
  path: '/cart/sync',
  tags: ['Cart'],
  summary: 'Merge anonymous guest cart into user account upon authentication',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: syncCartReqSchema,
        },
      },
    },
  },
  responses: {
    200: { description: 'Cart synchronized successfully' },
    ...withErrors(400, 401),
  },
});
