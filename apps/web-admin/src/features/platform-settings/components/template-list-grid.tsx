import React from 'react';

import type { NotificationTemplateItem, NotificationTemplatesMap } from '../types';

import { TemplateEditorCard } from './template-editor-card';

const TEMPLATE_LABELS: Record<string, string> = {
  ORDER_CONFIRMED: 'Order Confirmed (Customer)',
  ORDER_SHIPPED: 'Order Shipped (Customer)',
  OUT_FOR_DELIVERY: 'Out for Delivery (Customer)',
  ORDER_DELIVERED: 'Order Delivered (Customer)',
  ORDER_CANCELLED: 'Order Cancelled (Customer)',
  VENDOR_NEW_ORDER: 'New Order Received (Vendor)',
};

export interface TemplateListGridProps {
  templates: NotificationTemplatesMap;
  onChange: (key: string, updated: NotificationTemplateItem) => void;
}

export function TemplateListGrid({ templates, onChange }: TemplateListGridProps) {
  const keys = Object.keys(templates);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {keys.map((key) => {
        const item = templates[key];
        const label = TEMPLATE_LABELS[key] || key;
        return (
          <TemplateEditorCard
            key={key}
            eventKey={key}
            label={label}
            template={item}
            onChange={(updated) => onChange(key, updated)}
          />
        );
      })}
    </div>
  );
}
