import React from 'react';
import { Sparkles } from 'lucide-react';

import { PageHeader } from '@celebs/shared-ui/components/page-header';

import { WidgetPreviewBoundary } from '../components/widget-preview-boundary';
import { MOCK_SDUI_LAYOUT } from '../components/widget-preview-types';

export default function SDUIPagePreview() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Storefront Server-Driven UI (SDUI) Live Simulator
          </span>
        }
        description="Live preview and validate server-driven widget layouts across iOS, Android, and Tablet viewports."
      />

      <WidgetPreviewBoundary layout={MOCK_SDUI_LAYOUT} />
    </div>
  );
}
