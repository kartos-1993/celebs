import { z } from 'zod';

export const createOptionSetSchema = z.object({
  name: z.string().trim().min(1, 'Option set name is required'),
  displayName: z.string().trim().optional(),
  description: z.string().trim().optional(),
  values: z.array(z.string().trim().min(1)).default([]),
});

export const updateOptionSetSchema = z.object({
  name: z.string().trim().min(1).optional(),
  displayName: z.string().trim().optional(),
  description: z.string().trim().optional(),
  values: z.array(z.string().trim().min(1)).optional(),
});

export const optionSetResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  values: z.array(z.string()),
});

export type CreateOptionSetType = z.infer<typeof createOptionSetSchema>;
export type UpdateOptionSetType = z.infer<typeof updateOptionSetSchema>;
export type OptionSetType = z.infer<typeof optionSetResponseSchema>;
