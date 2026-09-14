import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { WidgetProps } from '../types';

import { Palette, Radius, Spacing } from '@/constants/theme';

export interface PromoCardData {
  title?: string;
  subtitle?: string;
  badge?: string;
  ctaText?: string;
  targetRoute?: string;
}

export function PromoCardWidget({ widget, onAction }: WidgetProps<PromoCardData>) {
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
        widget.styling?.borderRadius ? { borderRadius: widget.styling.borderRadius } : undefined,
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

const styles = StyleSheet.create({
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
