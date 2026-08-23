export interface WidgetStyling {
  paddingVertical?: number;
  paddingHorizontal?: number;
  backgroundColor?: string;
  marginBottom?: number;
  borderRadius?: number;
}

export interface WidgetAnalytics {
  trackingId: string;
  campaignTag?: string;
  sourceModule?: string;
}

export interface DynamicWidget<TData = Record<string, unknown>> {
  id: string;
  type: string;
  order: number;
  data: TData;
  styling?: WidgetStyling;
  analytics?: WidgetAnalytics;
}

export interface WidgetProps<TData = Record<string, unknown>> {
  widget: DynamicWidget<TData>;
  onAction?: (actionType: string, payload: unknown) => void;
}

export interface SDUIPageLayout {
  pageId: string;
  title?: string;
  widgets: DynamicWidget[];
  meta?: Record<string, unknown>;
  updatedAt?: string;
}
