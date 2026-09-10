import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { DynamicWidget } from '../types';

import { PromoCardData, PromoCardWidget } from './promo-card-widget';

import { Palette } from '@/constants/theme';
import { CategoryGrid } from '@/features/categories/components/category-grid';
import { BannerCarousel } from '@/features/home/components/banner-carousel';
import { CampaignCountdownBanner } from '@/features/home/components/campaign-countdown-banner';
import {
  ComboBundleData,
  ComboBundleShowcase,
} from '@/features/home/components/combo-bundle-showcase';
import { ProductGrid } from '@/features/products/components/product-grid';

export interface SDUIActionHandlers {
  onSelectCombo?: (combo: ComboBundleData) => void;
  onNavigateCategory?: (category: { id: string; name: string; slug: string }) => void;
  onNavigateProduct?: (productId: string) => void;
  onCustomAction?: (actionType: string, payload: unknown) => void;
  /** Incremented by the host screen's scroll handler to trigger infinite-scroll load-more. */
  loadMoreSignal?: number;
}

/**
 * Fallback component for unrecognized widget types sent by backend.
 */
function UnknownWidgetFallback({ widget }: { widget: DynamicWidget }) {
  if (!__DEV__) return null;

  return (
    <View style={styles.unknownWidget}>
      <Text style={styles.unknownTitle}>Unrecognized SDUI Widget: {widget.type}</Text>
      <Text style={styles.unknownDetails}>
        ID: {widget.id} (Order: {widget.order})
      </Text>
    </View>
  );
}

export type WidgetComponentRenderer = (props: {
  widget: DynamicWidget;
  handlers?: SDUIActionHandlers;
}) => React.ReactElement | null;

export const WIDGET_REGISTRY: Record<string, WidgetComponentRenderer> = {
  BANNER_CAROUSEL: () => <BannerCarousel />,

  CAMPAIGN_COUNTDOWN: () => <CampaignCountdownBanner />,

  COMBO_SHOWCASE: ({ handlers }) => <ComboBundleShowcase onSelectCombo={handlers?.onSelectCombo} />,

  CATEGORY_GRID: () => <CategoryGrid />,

  PRODUCT_GRID: ({ handlers }) => <ProductGrid loadMoreTrigger={handlers?.loadMoreSignal} />,

  PROMO_CARD: ({ widget, handlers }) => (
    <PromoCardWidget
      widget={widget as DynamicWidget<PromoCardData>}
      onAction={handlers?.onCustomAction}
    />
  ),
};

export function registerWidget(type: string, renderer: WidgetComponentRenderer): void {
  WIDGET_REGISTRY[type] = renderer;
}

export function renderSDUIWidget(
  widget: DynamicWidget,
  handlers?: SDUIActionHandlers,
): React.ReactElement | null {
  const Renderer = WIDGET_REGISTRY[widget.type];
  if (!Renderer) {
    return <UnknownWidgetFallback widget={widget} />;
  }

  return Renderer({ widget, handlers });
}

const styles = StyleSheet.create({
  unknownWidget: {
    padding: 12,
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Palette.gray100,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  unknownTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.gray600,
  },
  unknownDetails: {
    fontSize: 10,
    color: Palette.gray400,
    marginTop: 2,
  },
});
