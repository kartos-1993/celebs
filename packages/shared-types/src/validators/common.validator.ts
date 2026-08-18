import { z } from 'zod';

/**
 * Universal UUID validator for entity primary and foreign keys.
 */
export const idSchema = z.string().uuid('Invalid UUID format');

/**
 * Reusable route parameter schema for endpoints with `/:id`.
 */
export const idParamSchema = z.object({
  id: idSchema,
});

/**
 * Reusable route parameter schema for endpoints with `/:slug`.
 */
export const slugParamSchema = z.object({
  slug: z.string().trim().min(1, 'Slug is required'),
});

/**
 * Reusable pagination and search query schema.
 */
export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 20))),
  search: z.string().trim().optional(),
});

export type IdParamType = z.infer<typeof idParamSchema>;
export type SlugParamType = z.infer<typeof slugParamSchema>;
export type PaginationQueryType = z.infer<typeof paginationQuerySchema>;
