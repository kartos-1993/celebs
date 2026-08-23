import { z } from 'zod';

export const widgetStylingSchema = z.object({
  paddingVertical: z.number().nonnegative().optional(),
  paddingHorizontal: z.number().nonnegative().optional(),
  backgroundColor: z.string().optional(),
  marginBottom: z.number().optional(),
  borderRadius: z.number().nonnegative().optional(),
});

export const widgetAnalyticsSchema = z.object({
  trackingId: z.string().min(1),
  campaignTag: z.string().optional(),
  sourceModule: z.string().optional(),
});

export const dynamicWidgetSchema = z.object({
  id: z.string().min(1, 'Widget ID is required'),
  type: z.string().min(1, 'Widget type is required'),
  order: z.number().int().nonnegative(),
  data: z.record(z.unknown()).default({}),
  styling: widgetStylingSchema.optional(),
  analytics: widgetAnalyticsSchema.optional(),
  isActive: z.boolean().default(true),
});

export const sduiPageLayoutSchema = z.object({
  pageId: z.string().min(1, 'Page ID is required'),
  title: z.string().optional(),
  widgets: z.array(dynamicWidgetSchema).default([]),
  meta: z.record(z.unknown()).optional(),
  updatedAt: z.string().optional(),
});

export type DynamicWidgetValidationType = z.infer<typeof dynamicWidgetSchema>;
export type SDUIPageLayoutValidationType = z.infer<typeof sduiPageLayoutSchema>;
export type WidgetStylingValidationType = z.infer<typeof widgetStylingSchema>;
