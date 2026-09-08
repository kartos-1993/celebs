import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AlertCircle, Banknote, ChevronRight, CreditCard } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export type CheckoutPaymentMethod = 'COD' | 'ESEWA' | 'KHALTI';

interface PaymentMethodSelectorProps {
  paymentMethod: CheckoutPaymentMethod;
  isCodDisabled: boolean;
  grandTotal: number;
  codMaxLimit: number;
  onOpenModal: () => void;
}

const METHOD_DETAILS: Record<
  CheckoutPaymentMethod,
  { name: string; desc: string; color: string; badge: string }
> = {
  ESEWA: {
    name: 'eSewa Mobile Wallet',
    desc: 'Pay instantly with eSewa',
    color: '#60bb46',
    badge: 'e-',
  },
  KHALTI: { name: 'Khalti by IME', desc: 'Mobile Wallet', color: '#5c2d91', badge: 'K' },
  COD: { name: 'Cash on Delivery', desc: 'Pay upon delivery', color: '#0ea5e9', badge: 'COD' },
};

export function PaymentMethodSelector({
  paymentMethod,
  isCodDisabled,
  grandTotal,
  codMaxLimit,
  onOpenModal,
}: PaymentMethodSelectorProps) {
  const current = METHOD_DETAILS[paymentMethod] || METHOD_DETAILS.COD;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <CreditCard size={16} color={Palette.gray900} />
        <ThemedText style={styles.headerTitle}>Payment Method</ThemedText>
      </View>

      <TouchableOpacity
        style={styles.methodCard}
        onPress={onOpenModal}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Payment method: ${current.name}. Tap to change.`}
      >
        <View style={[styles.badgeWrap, { backgroundColor: current.color }]}>
          {paymentMethod === 'COD' ? (
            <Banknote size={16} color={Palette.white} />
          ) : (
            <ThemedText style={styles.badgeText}>{current.badge}</ThemedText>
          )}
        </View>

        <View style={styles.methodInfo}>
          <ThemedText style={styles.methodName}>{current.name}</ThemedText>
          <ThemedText style={styles.methodDesc}>{current.desc}</ThemedText>
        </View>

        <View style={styles.changeAction}>
          <ThemedText style={styles.changeText}>Change</ThemedText>
          <ChevronRight size={16} color={Palette.gray500} />
        </View>
      </TouchableOpacity>

      {paymentMethod === 'COD' && isCodDisabled && (
        <View style={styles.codWarning}>
          <AlertCircle size={14} color={Palette.warning} />
          <ThemedText style={styles.codWarningText}>
            COD limited to NPR {codMaxLimit.toLocaleString()}. Total: NPR{' '}
            {grandTotal.toLocaleString()}.
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle: { fontSize: FontSize.small, fontWeight: FontWeight.bold, color: Palette.gray900 },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: Palette.gray200,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  badgeWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: Palette.white, fontWeight: FontWeight.black, fontSize: FontSize.small },
  methodInfo: { flex: 1, gap: 2 },
  methodName: { fontSize: FontSize.small + 1, fontWeight: FontWeight.bold, color: Palette.gray900 },
  methodDesc: { fontSize: FontSize.caption, color: Palette.gray400 },
  changeAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  changeText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Palette.gray700,
  },
  codWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Palette.warningTint,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  codWarningText: {
    fontSize: FontSize.footnote,
    color: Palette.warning,
    fontWeight: FontWeight.semibold,
    flex: 1,
  },
});
