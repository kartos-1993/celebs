import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ORDER_FILTER_TABS, type OrderFilterTab } from '../utils/order-status';

import { ThemedText } from '@/components/themed-text';
import { FontSize, FontWeight, Palette, Spacing } from '@/constants/theme';

interface OrderStatusTabsProps {
  activeTab: OrderFilterTab;
  onSelectTab: (tab: OrderFilterTab) => void;
  unpaidCount?: number;
}

export function OrderStatusTabs({ activeTab, onSelectTab, unpaidCount = 0 }: OrderStatusTabsProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {ORDER_FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const showBadge = tab.key === 'TO_PAY' && unpaidCount > 0;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onSelectTab(tab.key)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <View style={styles.labelRow}>
                <ThemedText style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </ThemedText>
                {showBadge && (
                  <View style={styles.badge}>
                    <ThemedText
                      allowFontScaling={false}
                      maxFontSizeMultiplier={1}
                      numberOfLines={1}
                      style={styles.badgeText}
                    >
                      {unpaidCount > 99 ? '99+' : unpaidCount}
                    </ThemedText>
                  </View>
                )}
              </View>
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Palette.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.gray200,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  tab: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xs,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {},
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabText: {
    fontSize: FontSize.footnote,
    fontWeight: FontWeight.medium,
    color: Palette.gray600,
  },
  tabTextActive: {
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: Palette.gray900,
    borderRadius: 2,
  },
  badge: {
    backgroundColor: Palette.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Palette.white,
    fontSize: 10,
    fontWeight: FontWeight.bold,
    lineHeight: 12,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
