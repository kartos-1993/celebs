import { z } from 'zod';

import { emailSchema, passwordSchema } from './auth.validator';

export const userRoleEnum = z.enum(['CUSTOMER', 'VENDOR', 'STAFF', 'ADMIN', 'SUPERADMIN']);

export const createUserSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters long').max(255),
  email: emailSchema,
  password: passwordSchema,
  role: userRoleEnum.optional().default('CUSTOMER'),
});

export const updateUserRolePermissionsSchema = z.object({
  role: userRoleEnum.optional(),
  permissions: z.array(z.string()).optional(),
});

export type CreateUserType = z.infer<typeof createUserSchema>;
export type UpdateUserRolePermissionsType = z.infer<typeof updateUserRolePermissionsSchema>;
