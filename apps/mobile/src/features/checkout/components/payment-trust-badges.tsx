import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export function PaymentTrustBadges() {
  return (
    <View style={styles.container}>
      <View style={styles.badgeItem}>
        <ShieldCheck size={14} color={Palette.gray500} />
        <ThemedText style={styles.badgeText}>PCI-DSS</ThemedText>
      </View>
      <View style={styles.dot} />
      <View style={styles.badgeItem}>
        <ThemedText style={styles.badgeTextBold}>VISA</ThemedText>
        <ThemedText style={styles.badgeText}>Secure</ThemedText>
      </View>
      <View style={styles.dot} />
      <View style={styles.badgeItem}>
        <ThemedText style={styles.badgeTextBold}>Mastercard</ThemedText>
        <ThemedText style={styles.badgeText}>ID Check</ThemedText>
      </View>
      <View style={styles.dot} />
      <View style={styles.badgeItem}>
        <ThemedText style={styles.badgeText}>256-Bit SSL</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Palette.gray50,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: FontSize.micro,
    color: Palette.gray500,
    fontWeight: FontWeight.medium,
  },
  badgeTextBold: {
    fontSize: FontSize.micro,
    color: Palette.gray700,
    fontWeight: FontWeight.bold,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Palette.gray300,
  },
});
