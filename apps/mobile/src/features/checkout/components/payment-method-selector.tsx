import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { AlertCircle, CreditCard } from 'lucide-react-native';

import { styles } from '../styles/checkout.styles';

import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast/toast';
import { Palette } from '@/constants/theme';

interface PaymentMethodSelectorProps {
  paymentMethod: 'COD' | 'STRIPE';
  isCodDisabled: boolean;
  grandTotal: number;
  codMaxLimit: number;
  onSelectPaymentMethod: (method: 'COD' | 'STRIPE') => void;
}

interface PaymentRowOption {
  key: 'COD' | 'STRIPE' | 'WALLET';
  name: string;
  desc: string;
  disabled?: boolean;
  comingSoonTag?: string;
}

export function PaymentMethodSelector({
  paymentMethod,
  isCodDisabled,
  grandTotal,
  codMaxLimit,
  onSelectPaymentMethod,
}: PaymentMethodSelectorProps) {
  const paymentRows: PaymentRowOption[] = [
    {
      key: 'COD',
      name: 'Cash on Delivery',
      desc: 'Pay cash when the order arrives at your doorstep',
      ...(isCodDisabled ? { disabled: true } : {}),
    },
    {
      key: 'STRIPE',
      name: 'Card Payment (Stripe)',
      desc: 'Credit / debit cards — ideal for international cards too',
    },
    {
      key: 'WALLET',
      name: 'eSewa / Khalti Wallet',
      desc: 'Instant payment via Nepal digital wallet apps',
      disabled: true,
      comingSoonTag: 'COMING SOON',
    },
  ];

  return (
    <View style={styles.detailsContainer}>
      <View style={styles.sectionHeaderRow}>
        <CreditCard size={16} color={Palette.gray900} />
        <ThemedText style={styles.sectionTitle}>Payment Method</ThemedText>
      </View>

      <View style={styles.paymentList}>
        {paymentRows.map((row, index) => {
          const isSelected = row.key !== 'WALLET' && paymentMethod === row.key && !row.disabled;
          const isLast = index === paymentRows.length - 1;

          return (
            <TouchableOpacity
              key={row.key}
              style={[styles.paymentRow, !isLast && styles.rowDivided]}
              onPress={() => {
                if (row.disabled || row.key === 'WALLET') return;
                onSelectPaymentMethod(row.key);
                if (row.key === 'COD' && isCodDisabled) {
                  showToast(`Cash on Delivery is limited to NPR ${codMaxLimit.toLocaleString()}.`, {
                    type: 'error',
                  });
                }
              }}
              activeOpacity={row.disabled ? 1 : 0.7}
              disabled={row.disabled}
              accessible={true}
              accessibilityRole="radio"
              accessibilityLabel={row.name}
              accessibilityState={{ selected: isSelected, disabled: !!row.disabled }}
            >
              <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
              <View style={styles.paymentInfo}>
                <ThemedText
                  style={[styles.paymentName, row.disabled && { color: Palette.gray400 }]}
                >
                  {row.name}
                  {row.comingSoonTag ? `   ${row.comingSoonTag}` : ''}
                </ThemedText>
                <ThemedText style={styles.paymentDesc}>{row.desc}</ThemedText>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {isCodDisabled && (
        <View style={styles.codWarning}>
          <AlertCircle size={14} color={Palette.warning} />
          <ThemedText style={styles.codWarningText}>
            COD limited to max NPR {codMaxLimit.toLocaleString()}. Total is NPR{' '}
            {grandTotal.toLocaleString()}.
          </ThemedText>
        </View>
      )}
    </View>
  );
}
