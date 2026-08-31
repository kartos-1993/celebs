import { z } from 'zod';

import { addressSchema, checkoutSchema, updateOrderItemStatusSchema } from '@celebs/shared-types';

import { withErrors } from './error.openapi';
import { registry } from './registry';

// Register Schemas
const addressReqSchema = registry.register('AddressRequest', addressSchema);
const checkoutReqSchema = registry.register('CheckoutRequest', checkoutSchema);
const updateItemStatusReqSchema = registry.register(
  'UpdateOrderItemStatusRequest',
  updateOrderItemStatusSchema,
);

// ── GET /orders/addresses ──
registry.registerPath({
  method: 'get',
  path: '/orders/addresses',
  tags: ['Orders & Checkout'],
  summary: 'Get customer saved shipping addresses',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'List of shipping addresses',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(z.record(z.string(), z.any())),
          }),
        },
      },
    },
    ...withErrors(401),
  },
});

// ── POST /orders/addresses ──
registry.registerPath({
  method: 'post',
  path: '/orders/addresses',
  tags: ['Orders & Checkout'],
  summary: 'Save a new customer shipping address',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: addressReqSchema,
        },
      },
    },
  },
  responses: {
    201: { description: 'Address created' },
    ...withErrors(400, 401),
  },
});

// ── POST /orders/checkout ──
registry.registerPath({
  method: 'post',
  path: '/orders/checkout',
  tags: ['Orders & Checkout'],
  summary: 'Submit checkout and place order (Idempotent)',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: checkoutReqSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Order placed successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.record(z.string(), z.any()),
          }),
        },
      },
    },
    ...withErrors(400, 401),
  },
});

// ── GET /orders/my-orders ──
registry.registerPath({
  method: 'get',
  path: '/orders/my-orders',
  tags: ['Orders & Checkout'],
  summary: 'Get customer order history',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'List of past orders' },
    ...withErrors(401),
  },
});

// ── GET /orders/my-orders/:orderId ──
registry.registerPath({
  method: 'get',
  path: '/orders/my-orders/{orderId}',
  tags: ['Orders & Checkout'],
  summary: 'Get details of specific order',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orderId: z.string() }),
  },
  responses: {
    200: { description: 'Order detail with items and tracking' },
    ...withErrors(401, 404),
  },
});

// ── GET /orders/vendor/orders ──
registry.registerPath({
  method: 'get',
  path: '/orders/vendor/orders',
  tags: ['Orders & Checkout'],
  summary: 'Get vendor scoped orders for fulfillment',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Vendor fulfillment orders' },
    ...withErrors(401, 403),
  },
});

// ── PATCH /orders/vendor/orders/items/:orderItemId/status ──
registry.registerPath({
  method: 'patch',
  path: '/orders/vendor/orders/items/{orderItemId}/status',
  tags: ['Orders & Checkout'],
  summary: 'Update item fulfillment state (PACKED, HANDED_OVER, etc.)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orderItemId: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: updateItemStatusReqSchema,
        },
      },
    },
  },
  responses: {
    200: { description: 'Order item status updated' },
    ...withErrors(400, 401, 403),
  },
});
