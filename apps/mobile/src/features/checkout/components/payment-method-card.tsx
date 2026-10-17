import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Banknote, ChevronRight, CreditCard } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandColor } from '@/constants/brand-colors';
import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export type PaymentMethodKey = 'CARD' | 'KHALTI' | 'ESEWA' | 'COD';

interface PaymentMethodCardProps {
  methodKey: PaymentMethodKey;
  title: string;
  subtitle: string;
  isSelected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function MethodIcon({ methodKey }: { methodKey: PaymentMethodKey }) {
  const bg =
    methodKey === 'CARD'
      ? BrandColor.esewaCard
      : methodKey === 'KHALTI'
        ? BrandColor.khalti
        : methodKey === 'ESEWA'
          ? BrandColor.esewa
          : BrandColor.cod;
  return (
    <View style={[styles.iconWrap, { backgroundColor: bg }]}>
      {methodKey === 'CARD' && <CreditCard size={18} color={Palette.white} />}
      {methodKey === 'KHALTI' && <ThemedText style={styles.badgeText}>K</ThemedText>}
      {methodKey === 'ESEWA' && <ThemedText style={styles.badgeText}>e-</ThemedText>}
      {methodKey === 'COD' && <Banknote size={18} color={Palette.white} />}
    </View>
  );
}

export function PaymentMethodCard({
  methodKey,
  title,
  subtitle,
  isSelected,
  disabled,
  onPress,
}: PaymentMethodCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected, disabled && styles.cardDisabled]}
      onPress={onPress}
      activeOpacity={disabled ? 1 : 0.7}
      disabled={disabled}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <MethodIcon methodKey={methodKey} />
      <View style={styles.content}>
        <ThemedText style={[styles.title, disabled && styles.textDisabled]}>{title}</ThemedText>
        <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
      </View>
      {methodKey === 'CARD' && (
        <View style={styles.cardBadges}>
          <ThemedText style={styles.visaText}>VISA</ThemedText>
          <View style={styles.mcCircles}>
            <View style={[styles.mcCircle, { backgroundColor: BrandColor.mastercardRed }]} />
            <View
              style={[
                styles.mcCircle,
                { backgroundColor: BrandColor.mastercardAmber, marginLeft: -4 },
              ]}
            />
          </View>
        </View>
      )}
      <ChevronRight size={18} color={disabled ? Palette.gray300 : Palette.gray400} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.gray100,
    gap: Spacing.md,
  },
  cardSelected: { backgroundColor: Palette.gray50 },
  cardDisabled: { opacity: 0.5 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: Palette.white, fontWeight: FontWeight.black, fontSize: FontSize.base },
  content: { flex: 1, gap: 2 },
  title: { fontSize: FontSize.small + 1, fontWeight: FontWeight.bold, color: Palette.gray900 },
  subtitle: { fontSize: FontSize.caption, color: Palette.gray400 },
  textDisabled: { color: Palette.gray400 },
  cardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginRight: Spacing.xs,
  },
  visaText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.black,
    color: BrandColor.visa,
    fontStyle: 'italic',
  },
  mcCircles: { flexDirection: 'row', alignItems: 'center' },
  mcCircle: { width: 10, height: 10, borderRadius: 5 },
});
