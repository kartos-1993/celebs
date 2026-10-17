import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/constants/theme';

export type NotificationTab = 'ALL' | 'ORDERS' | 'OFFERS';

interface NotificationFilterTabsProps {
  activeTab: NotificationTab;
  onSelectTab: (tab: NotificationTab) => void;
}

const TABS: Array<{ key: NotificationTab; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'ORDERS', label: 'Orders 📦' },
  { key: 'OFFERS', label: 'Offers 🏷️' },
];

export function NotificationFilterTabs({ activeTab, onSelectTab }: NotificationFilterTabsProps) {
  return (
    <View style={styles.container}>
      {TABS.map((t) => {
        const isActive = activeTab === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => onSelectTab(t.key)}
            activeOpacity={0.7}
          >
            <ThemedText style={[styles.tabText, isActive && styles.activeTabText]}>
              {t.label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Palette.white,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray100,
    gap: Spacing.xs,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    backgroundColor: Palette.gray100,
  },
  activeTab: {
    backgroundColor: Palette.brand,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.gray700,
  },
  activeTabText: {
    color: Palette.white,
  },
});
