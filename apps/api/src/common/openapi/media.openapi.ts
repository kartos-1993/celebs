import { z } from 'zod';

import {
  batchPresignSchema,
  confirmUploadSchema,
  presignFileSchema,
} from '@celebs/shared-types';

import { registry } from './registry';

// Register Schemas
const presignRequestSchema = registry.register('PresignRequest', presignFileSchema);
const batchPresignRequestSchema = registry.register('BatchPresignRequest', batchPresignSchema);
const confirmUploadRequestSchema = registry.register('ConfirmUploadRequest', confirmUploadSchema);

const presignResponseDataSchema = z.object({
  key: z.string(),
  uploadUrl: z.string().url(),
  publicUrl: z.string().url(),
  headers: z.record(z.string(), z.string()),
  expiresIn: z.number(),
  originalname: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

const mediaAssetResponseDataSchema = z.object({
  key: z.string(),
  url: z.string().url(),
  bytes: z.number(),
  contentType: z.string(),
  originalname: z.string(),
  derivatives: z
    .object({
      zoom: z.string().url().optional(),
      card: z.string().url().optional(),
      thumb: z.string().url().optional(),
      placeholder: z.string().url().optional(),
    })
    .optional(),
});

// POST /media/presign
registry.registerPath({
  method: 'post',
  path: '/media/presign',
  tags: ['Media Storage'],
  summary: 'Generate a presigned PUT URL for direct browser → Cloudflare R2 upload',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: presignRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Presigned upload URL successfully generated',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: presignResponseDataSchema,
          }),
        },
      },
    },
    400: {
      description: 'Validation error (invalid MIME type, oversized file, etc.)',
    },
    401: {
      description: 'Unauthorized',
    },
    403: {
      description: 'Forbidden (Unapproved vendor or missing product:create permission)',
    },
  },
});

// POST /media/batch-presign
registry.registerPath({
  method: 'post',
  path: '/media/batch-presign',
  tags: ['Media Storage'],
  summary: 'Generate multiple presigned PUT URLs for batch uploads',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: batchPresignRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Array of presigned upload URLs successfully generated',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(presignResponseDataSchema),
          }),
        },
      },
    },
    400: {
      description: 'Validation error',
    },
    401: {
      description: 'Unauthorized',
    },
  },
});

// POST /media/confirm
registry.registerPath({
  method: 'post',
  path: '/media/confirm',
  tags: ['Media Storage'],
  summary: 'Confirm uploaded object on R2 and enqueue async BullMQ optimization',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: confirmUploadRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Object verified and confirmed',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: mediaAssetResponseDataSchema,
          }),
        },
      },
    },
    400: {
      description: 'Object not found in storage or validation error',
    },
    401: {
      description: 'Unauthorized',
    },
  },
});
