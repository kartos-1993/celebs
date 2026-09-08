import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ShoppingBag } from 'lucide-react-native';

import type { OrderFilterTab } from '../utils/order-status';

import { ThemedText } from '@/components/themed-text';
import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

interface OrdersEmptyStateProps {
  activeTab: OrderFilterTab;
}

export function OrdersEmptyState({ activeTab }: OrdersEmptyStateProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <ShoppingBag size={32} color={Palette.gray400} />
      </View>
      <ThemedText style={styles.title}>No orders found</ThemedText>
      <ThemedText style={styles.subtitle}>
        {activeTab === 'ALL'
          ? "You haven't placed any orders yet."
          : `No orders in the "${activeTab.replace('_', ' ').toLowerCase()}" category.`}
      </ThemedText>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => router.push('/(tabs)')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Start Shopping"
      >
        <ThemedText style={styles.btnText}>Start Shopping</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    marginTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    backgroundColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  subtitle: {
    fontSize: FontSize.caption,
    color: Palette.gray500,
    textAlign: 'center',
    lineHeight: 18,
  },
  btn: {
    backgroundColor: Palette.gray900,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  btnText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.bold,
    color: Palette.white,
  },
});
