import React from 'react';
import { Modal, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AlertCircle, X } from 'lucide-react-native';

import { PaymentMethodCard } from './payment-method-card';
import { PaymentTrustBadges } from './payment-trust-badges';

import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast/toast';
import { FontSize, FontWeight, Palette, Spacing } from '@/constants/theme';

export type CheckoutPaymentMethod = 'COD' | 'ESEWA' | 'KHALTI';

interface SelectPaymentMethodModalProps {
  visible: boolean;
  onClose: () => void;
  selectedMethod: CheckoutPaymentMethod;
  onSelectMethod: (method: CheckoutPaymentMethod) => void;
  subtotal: number;
  grandTotal: number;
  isCodDisabled: boolean;
  codMaxLimit: number;
}

export function SelectPaymentMethodModal({
  visible,
  onClose,
  selectedMethod,
  onSelectMethod,
  subtotal,
  grandTotal,
  isCodDisabled,
  codMaxLimit,
}: SelectPaymentMethodModalProps) {
  const handleSelect = (method: CheckoutPaymentMethod) => {
    if (method === 'COD' && isCodDisabled) {
      showToast(`Cash on Delivery is limited to NPR ${codMaxLimit.toLocaleString()}.`, {
        type: 'error',
      });
      return;
    }
    onSelectMethod(method);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Select Payment Method</ThemedText>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Close"
          >
            <X size={22} color={Palette.gray900} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <ThemedText style={styles.sectionHeader}>Recommended method(s)</ThemedText>
          <PaymentMethodCard
            methodKey="CARD"
            title="Credit/Debit Card"
            subtitle="Credit/Debit Card"
            onPress={() => showToast('Credit/Debit Card gateway coming soon.')}
          />

          <ThemedText style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>
            Other Payment Methods
          </ThemedText>
          <PaymentMethodCard
            methodKey="KHALTI"
            title="Khalti by IME"
            subtitle="Mobile Wallet"
            isSelected={selectedMethod === 'KHALTI'}
            onPress={() => handleSelect('KHALTI')}
          />
          <PaymentMethodCard
            methodKey="ESEWA"
            title="eSewa Mobile Wallet"
            subtitle="eSewa Mobile Wallet"
            isSelected={selectedMethod === 'ESEWA'}
            onPress={() => handleSelect('ESEWA')}
          />
          <PaymentMethodCard
            methodKey="COD"
            title="Cash on Delivery"
            subtitle="Cash on Delivery"
            disabled={isCodDisabled}
            isSelected={selectedMethod === 'COD'}
            onPress={() => handleSelect('COD')}
          />

          {isCodDisabled && (
            <View style={styles.codWarning}>
              <AlertCircle size={14} color={Palette.warning} />
              <ThemedText style={styles.codWarningText}>
                COD limited to max NPR {codMaxLimit.toLocaleString()}. Total is NPR{' '}
                {grandTotal.toLocaleString()}.
              </ThemedText>
            </View>
          )}

          <PaymentTrustBadges />
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <ThemedText style={styles.subtotalLabel}>Subtotal</ThemedText>
            <ThemedText style={styles.subtotalValue}>Rs. {subtotal.toLocaleString()}</ThemedText>
          </View>
          <View style={styles.footerRow}>
            <ThemedText style={styles.totalLabel}>Total Amount</ThemedText>
            <ThemedText style={styles.totalValue}>Rs. {grandTotal.toLocaleString()}</ThemedText>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.white,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.gray100,
  },
  headerTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Palette.gray900 },
  closeBtn: { position: 'absolute', right: Spacing.lg, padding: 4 },
  scroll: { flex: 1 },
  scrollContent: { paddingVertical: Spacing.md },
  sectionHeader: {
    fontSize: FontSize.caption + 1,
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  codWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Palette.warningTint,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: 8,
  },
  codWarningText: {
    fontSize: FontSize.footnote,
    color: Palette.warning,
    fontWeight: FontWeight.semibold,
    flex: 1,
  },
  footer: {
    backgroundColor: Palette.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.gray200,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subtotalLabel: { fontSize: FontSize.small, color: Palette.gray500 },
  subtotalValue: { fontSize: FontSize.small, fontWeight: FontWeight.bold, color: Palette.gray900 },
  totalLabel: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Palette.gray900 },
  totalValue: { fontSize: FontSize.md, fontWeight: FontWeight.black, color: '#f95738' },
});
