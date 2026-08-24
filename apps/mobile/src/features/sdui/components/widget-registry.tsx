import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { DynamicWidget, WidgetProps } from '../types';

import { CategoryGrid } from '@/features/categories/components/category-grid';
import { BannerCarousel } from '@/features/home/components/banner-carousel';
import { CampaignCountdownBanner } from '@/features/home/components/campaign-countdown-banner';
import {
  ComboBundleData,
  ComboBundleShowcase,
} from '@/features/home/components/combo-bundle-showcase';
import { ProductGrid } from '@/features/products/components/product-grid';
import { Palette, Radius, Spacing } from '@/constants/theme';

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
      <Text style={styles.unknownDetails}>ID: {widget.id} (Order: {widget.order})</Text>
    </View>
  );
}

/**
 * Custom Promo Card Widget.
 */
function PromoCardWidget({
  widget,
  onAction,
}: WidgetProps<{
  title?: string;
  subtitle?: string;
  badge?: string;
  ctaText?: string;
  targetRoute?: string;
}>) {
  const { title, subtitle, badge, ctaText, targetRoute } = widget.data || {};

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onAction?.('NAVIGATE', { route: targetRoute })}
      style={[
        styles.promoCard,
        widget.styling?.backgroundColor
          ? { backgroundColor: widget.styling.backgroundColor }
          : undefined,
        widget.styling?.borderRadius
          ? { borderRadius: widget.styling.borderRadius }
          : undefined,
      ]}
    >
      {badge && (
        <View style={styles.promoBadge}>
          <Text style={styles.promoBadgeText}>{badge}</Text>
        </View>
      )}
      {title && <Text style={styles.promoTitle}>{title}</Text>}
      {subtitle && <Text style={styles.promoSubtitle}>{subtitle}</Text>}
      {ctaText && (
        <View style={styles.promoCtaButton}>
          <Text style={styles.promoCtaText}>{ctaText}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export type WidgetComponentRenderer = (props: {
  widget: DynamicWidget;
  handlers?: SDUIActionHandlers;
  refreshKey?: number;
}) => React.ReactElement | null;

export const WIDGET_REGISTRY: Record<string, WidgetComponentRenderer> = {
  BANNER_CAROUSEL: ({ widget: _widget, refreshKey }) => (
    <BannerCarousel key={`banner-${refreshKey || 0}`} />
  ),

  CAMPAIGN_COUNTDOWN: ({ widget: _widget, refreshKey }) => (
    <CampaignCountdownBanner key={`camp-${refreshKey || 0}`} />
  ),

  COMBO_SHOWCASE: ({ widget: _widget, handlers, refreshKey }) => (
    <ComboBundleShowcase
      key={`combo-${refreshKey || 0}`}
      onSelectCombo={handlers?.onSelectCombo}
    />
  ),

  CATEGORY_GRID: ({ widget: _widget, refreshKey }) => (
    <CategoryGrid key={`cat-${refreshKey || 0}`} />
  ),

  PRODUCT_GRID: ({ widget: _widget, handlers, refreshKey }) => (
    <ProductGrid
      key={`prod-${refreshKey || 0}`}
      loadMoreTrigger={handlers?.loadMoreSignal}
    />
  ),

  PROMO_CARD: ({ widget, handlers }) => (
    <PromoCardWidget
      widget={widget as DynamicWidget<{ title?: string; subtitle?: string; badge?: string; ctaText?: string; targetRoute?: string }>}
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
  refreshKey?: number
): React.ReactElement | null {
  const Renderer = WIDGET_REGISTRY[widget.type];
  if (!Renderer) {
    return <UnknownWidgetFallback widget={widget} />;
  }

  return Renderer({ widget, handlers, refreshKey });
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
  promoCard: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Palette.gray900,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  promoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Palette.danger,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    marginBottom: Spacing.sm,
  },
  promoBadgeText: {
    color: Palette.white,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.white,
    marginBottom: Spacing.xs,
  },
  promoSubtitle: {
    fontSize: 12,
    color: Palette.gray400,
    marginBottom: Spacing.md,
  },
  promoCtaButton: {
    alignSelf: 'flex-start',
    backgroundColor: Palette.white,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  promoCtaText: {
    color: Palette.gray900,
    fontSize: 12,
    fontWeight: '700',
  },
});
