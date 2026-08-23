import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ArrowRight, ShieldCheck } from 'lucide-react-native';

import { styles } from './cart-summary-footer.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

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
        <ShieldCheck size={16} color={Palette.success} />
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
        <ArrowRight size={18} color={Palette.white} />
      </TouchableOpacity>
    </View>
  );
};
