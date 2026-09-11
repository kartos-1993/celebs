import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';

import type { OrderSummaryCounts } from '../api';
import { styles } from '../styles/order-status-tabs.styles';
import { ORDER_FILTER_TABS, type OrderFilterTab } from '../utils/order-status';

import { ThemedText } from '@/components/themed-text';

interface OrderStatusTabsProps {
  activeTab: OrderFilterTab;
  onSelectTab: (tab: OrderFilterTab) => void;
  counts?: OrderSummaryCounts;
}

function getTabCount(key: OrderFilterTab, counts?: OrderSummaryCounts): number {
  if (!counts) return 0;
  switch (key) {
    case 'TO_PAY':
      return counts.toPay ?? 0;
    case 'TO_SHIP':
      return counts.toShip ?? 0;
    case 'TO_RECEIVE':
      return counts.toReceive ?? 0;
    case 'TO_REVIEW':
      return counts.toReview ?? 0;
    case 'DELIVERED':
      return counts.delivered ?? 0;
    case 'CANCELLED':
      return counts.cancelled ?? 0;
    default:
      return 0;
  }
}

export function OrderStatusTabs({ activeTab, onSelectTab, counts }: OrderStatusTabsProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {ORDER_FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = getTabCount(tab.key, counts);
          const showBadge = count > 0;
          const isUrgent = tab.key === 'TO_PAY';

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
                  <View style={[styles.badge, !isUrgent && styles.badgeNeutral]}>
                    <ThemedText
                      allowFontScaling={false}
                      maxFontSizeMultiplier={1}
                      numberOfLines={1}
                      style={styles.badgeText}
                    >
                      {count > 99 ? '99+' : count}
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
