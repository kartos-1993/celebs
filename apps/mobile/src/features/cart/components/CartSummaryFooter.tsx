import React from 'react';
import { StyleSheet,TouchableOpacity, View } from 'react-native';
import { ArrowRight, ShieldCheck } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';

interface CartSummaryFooterProps {
  subtotal: number;
  shippingFee: number;
  grandTotal: number;
  onCheckout: () => void;
}

export const CartSummaryFooter: React.FC<CartSummaryFooterProps> = ({
  subtotal,
  shippingFee,
  grandTotal,
  onCheckout,
}) => {
  return (
    <View style={styles.container}>
      {/* Price Summary Breakdown */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
          <ThemedText style={styles.summaryValue}>Rs. {subtotal.toLocaleString()}</ThemedText>
        </View>

        <View style={styles.summaryRow}>
          <ThemedText style={styles.summaryLabel}>Estimated Shipping</ThemedText>
          <ThemedText style={styles.summaryValue}>
            {shippingFee === 0 ? 'FREE' : `Rs. ${shippingFee}`}
          </ThemedText>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <ThemedText style={styles.totalLabel}>Total Amount</ThemedText>
          <ThemedText style={styles.totalValue}>Rs. {grandTotal.toLocaleString()}</ThemedText>
        </View>
      </View>

      {/* Trust Badge */}
      <View style={styles.trustBadge}>
        <ShieldCheck size={16} color="#16a34a" />
        <ThemedText style={styles.trustText}>Secure 256-bit SSL Checkout & Free Returns</ThemedText>
      </View>

      {/* Checkout Button */}
      <TouchableOpacity
        style={styles.checkoutBtn}
        activeOpacity={0.85}
        onPress={onCheckout}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Proceed to checkout"
      >
        <ThemedText style={styles.checkoutBtnText}>Proceed to Checkout</ThemedText>
        <ArrowRight size={18} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#18181b',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#18181b',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#208AEF',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trustText: {
    fontSize: 12,
    color: '#4b5563',
  },
  checkoutBtn: {
    backgroundColor: '#208AEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  checkoutBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
