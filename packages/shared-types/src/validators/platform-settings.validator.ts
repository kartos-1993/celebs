import { z } from 'zod';

export const settingTypeSchema = z.enum(['BOOLEAN', 'NUMBER', 'STRING', 'JSON']);

export const platformSettingSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.string(),
  type: settingTypeSchema,
  group: z.string().default('GENERAL'),
  label: z.string().min(1, 'Label is required'),
  description: z.string().nullable().optional(),
  isPublic: z.boolean().default(false),
  updatedBy: z.string().nullable().optional(),
  updatedAt: z.union([z.string(), z.date()]),
  createdAt: z.union([z.string(), z.date()]),
});

export const updatePlatformSettingSchema = z.object({
  value: z.string(),
  reason: z.string().max(255).optional(),
});

export const bulkUpdatePlatformSettingsSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string(),
    })
  ).min(1, 'At least one setting must be provided'),
  reason: z.string().max(255).optional(),
});

export type PlatformSettingType = z.infer<typeof platformSettingSchema>;
export type UpdatePlatformSettingType = z.infer<typeof updatePlatformSettingSchema>;
export type BulkUpdatePlatformSettingsType = z.infer<typeof bulkUpdatePlatformSettingsSchema>;
