import { registry } from './registry';
import { z } from 'zod';
import {
  registerSchema,
  loginSchema,
  verificationEmailSchema,
  vendorRegisterSchema,
} from '@celebs/shared-types';

// We can register request/response bodies or schemas in components
const registerRequestSchema = registry.register(
  'RegisterRequest',
  registerSchema._def.schema
);

const vendorRegisterRequestSchema = registry.register(
  'VendorRegisterRequest',
  vendorRegisterSchema._def.schema
);

const loginRequestSchema = registry.register(
  'LoginRequest',
  loginSchema
);

const verifyEmailRequestSchema = registry.register(
  'VerifyEmailRequest',
  verificationEmailSchema
);

// Register POST /auth/register
registry.registerPath({
  method: 'post',
  path: '/auth/register',
  tags: ['Authentication'],
  summary: 'Register a new customer account',
  request: {
    body: {
      content: {
        'application/json': {
          schema: registerRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Successful registration',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              id: z.string(),
              name: z.string(),
              email: z.string(),
              role: z.string(),
            }),
          }),
        },
      },
    },
    400: {
      description: 'Validation / duplicate email error',
    },
  },
});

// Register POST /auth/vendor/register
registry.registerPath({
  method: 'post',
  path: '/auth/vendor/register',
  tags: ['Authentication'],
  summary: 'Register a new vendor account (Onboarding)',
  request: {
    body: {
      content: {
        'application/json': {
          schema: vendorRegisterRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Successful vendor registration (onboarding pending approval)',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              id: z.string(),
              name: z.string(),
              email: z.string(),
              role: z.string(),
            }),
          }),
        },
      },
    },
    400: {
      description: 'Validation or duplicate field error',
    },
  },
});

// Register POST /auth/login
registry.registerPath({
  method: 'post',
  path: '/auth/login',
  tags: ['Authentication'],
  summary: 'Login to customer account',
  request: {
    body: {
      content: {
        'application/json': {
          schema: loginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successful login',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              user: z.object({
                id: z.string(),
                name: z.string(),
                email: z.string(),
                role: z.string(),
              }),
              accessToken: z.string(),
              refreshToken: z.string(),
            }),
          }),
        },
      },
    },
    401: {
      description: 'Invalid credentials',
    },
  },
});

// Register POST /auth/verify-email
registry.registerPath({
  method: 'post',
  path: '/auth/verify-email',
  tags: ['Authentication'],
  summary: 'Verify user email address',
  request: {
    body: {
      content: {
        'application/json': {
          schema: verifyEmailRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Email verified successfully',
    },
    400: {
      description: 'Invalid or expired verification code',
    },
  },
});

// Register POST /auth/logout
registry.registerPath({
  method: 'post',
  path: '/auth/logout',
  tags: ['Authentication'],
  summary: 'Logout of the current session',
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  responses: {
    200: {
      description: 'Logged out successfully',
    },
    401: {
      description: 'Unauthorized',
    },
  },
});
