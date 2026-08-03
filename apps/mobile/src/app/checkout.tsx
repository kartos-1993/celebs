import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MapPin,
  CreditCard,
  Check,
  ShieldCheck,
  ChevronLeft,
  Lock,
  AlertCircle,
  Truck,
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCart } from '@/features/cart/context/cart-context';

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cart, subtotal, clearCart } = useCart();

  // Staging simulate auth state (In real runtime, fetched from auth context)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  // Address State (Daraz Nepal Structure)
  const [fullName, setFullName] = useState<string>('Aashish Shrestha');
  const [phone, setPhone] = useState<string>('9841234567');
  const [province, setProvince] = useState<string>('Bagmati');
  const [district, setDistrict] = useState<string>('Kathmandu');
  const [cityArea, setCityArea] = useState<string>('New Baneshwor');
  const [streetAddress, setStreetAddress] = useState<string>('House #42, Near Civil Hospital');

  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'STRIPE' | 'ESEWA' | 'KHALTI'>('COD');

  const shippingFee = subtotal > 3000 ? 0 : 150;
  const grandTotal = subtotal + shippingFee;
  const isCodDisabled = grandTotal > 5000;

  const handlePlaceOrder = async () => {
    if (!isLoggedIn) {
      Alert.alert('Login Required', 'Please sign in to complete your checkout.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/me') },
      ]);
      return;
    }

    if (!fullName || !phone || !cityArea || !streetAddress) {
      Alert.alert('Incomplete Address', 'Please fill in your delivery name, phone, and city area.');
      return;
    }

    if (paymentMethod === 'COD' && isCodDisabled) {
      Alert.alert('COD Limit Exceeded', 'Cash on Delivery is limited to max NPR 5,000. Please select Stripe or online payment.');
      return;
    }

    setLoading(true);

    try {
      // Simulate API call to POST /api/v1/orders/checkout
      await new Promise((resolve) => setTimeout(resolve, 1200));

      Alert.alert(
        'Order Confirmed! 🎉',
        `Your order has been placed successfully! Order ID: CEL-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        [
          {
            text: 'View My Orders',
            onPress: async () => {
              await clearCart();
              router.push('/orders');
            },
          },
        ]
      );
    } catch {
      Alert.alert('Order Failed', 'Something went wrong while placing your order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.authNoticeContainer}>
          <Lock size={48} color="#208AEF" />
          <ThemedText style={styles.authNoticeTitle}>Login to Proceed to Checkout</ThemedText>
          <ThemedText style={styles.authNoticeDesc}>
            Your items are saved safely in your cart. Sign in or register to enter your shipping address and select payment.
          </ThemedText>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/me')}>
            <ThemedText style={styles.primaryBtnText}>Sign In / Register</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#18181b" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Checkout</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Shipping Address Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color="#208AEF" />
            <ThemedText style={styles.sectionTitle}>Nepal Shipping Address</ThemedText>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Recipient Full Name</ThemedText>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. Ram Bahadur Shrestha"
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Phone Number</ThemedText>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="e.g. 9841234567"
            />
          </View>

          <View style={styles.rowGroup}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <ThemedText style={styles.label}>Province</ThemedText>
              <TextInput style={styles.input} value={province} onChangeText={setProvince} />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <ThemedText style={styles.label}>District</ThemedText>
              <TextInput style={styles.input} value={district} onChangeText={setDistrict} />
            </View>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>City / Area (e.g. Baneshwor, Jhamsikhel)</ThemedText>
            <TextInput
              style={styles.input}
              value={cityArea}
              onChangeText={setCityArea}
              placeholder="e.g. New Baneshwor, Thamel, Jhamsikhel"
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Street Address & Landmark</ThemedText>
            <TextInput
              style={styles.input}
              value={streetAddress}
              onChangeText={setStreetAddress}
              placeholder="e.g. House #42, Near Civil Hospital"
            />
          </View>
        </View>

        {/* Payment Method Selector */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <CreditCard size={20} color="#208AEF" />
            <ThemedText style={styles.sectionTitle}>Payment Method</ThemedText>
          </View>

          {/* COD Option */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'COD' && styles.paymentOptionSelected,
              isCodDisabled && styles.paymentOptionDisabled,
            ]}
            onPress={() => !isCodDisabled && setPaymentMethod('COD')}
            activeOpacity={isCodDisabled ? 1 : 0.8}
          >
            <View style={styles.paymentRadioRow}>
              <View style={[styles.radioOuter, paymentMethod === 'COD' && styles.radioOuterSelected]}>
                {paymentMethod === 'COD' && <View style={styles.radioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.paymentName}>Cash on Delivery (COD)</ThemedText>
                <ThemedText style={styles.paymentDesc}>Pay cash when order arrives at your doorstep</ThemedText>
              </View>
            </View>

            {isCodDisabled && (
              <View style={styles.codWarningBadge}>
                <AlertCircle size={14} color="#b45309" />
                <ThemedText style={styles.codWarningText}>
                  COD limited to max NPR 5,000. Total is NPR {grandTotal.toLocaleString()}.
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>

          {/* Stripe Option */}
          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'STRIPE' && styles.paymentOptionSelected]}
            onPress={() => setPaymentMethod('STRIPE')}
            activeOpacity={0.8}
          >
            <View style={styles.paymentRadioRow}>
              <View style={[styles.radioOuter, paymentMethod === 'STRIPE' && styles.radioOuterSelected]}>
                {paymentMethod === 'STRIPE' && <View style={styles.radioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.paymentName}>Stripe (Credit / Debit Card)</ThemedText>
                <ThemedText style={styles.paymentDesc}>Ideal for international cards & Nepalis buying from abroad</ThemedText>
              </View>
            </View>
          </TouchableOpacity>

          {/* eSewa Option */}
          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'ESEWA' && styles.paymentOptionSelected]}
            onPress={() => setPaymentMethod('ESEWA')}
            activeOpacity={0.8}
          >
            <View style={styles.paymentRadioRow}>
              <View style={[styles.radioOuter, paymentMethod === 'ESEWA' && styles.radioOuterSelected]}>
                {paymentMethod === 'ESEWA' && <View style={styles.radioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.paymentName}>eSewa / Khalti Digital Wallet</ThemedText>
                <ThemedText style={styles.paymentDesc}>Instant payment via Nepal digital wallet app</ThemedText>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Price Summary Breakdown */}
        <View style={styles.sectionCard}>
          <ThemedText style={styles.sectionTitle}>Order Summary</ThemedText>

          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
            <ThemedText style={styles.summaryValue}>Rs. {subtotal.toLocaleString()}</ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Delivery Fee</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {shippingFee === 0 ? 'FREE' : `Rs. ${shippingFee}`}
            </ThemedText>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <ThemedText style={styles.totalLabel}>Grand Total</ThemedText>
            <ThemedText style={styles.totalValue}>Rs. {grandTotal.toLocaleString()}</ThemedText>
          </View>
        </View>

        {/* Security badge */}
        <View style={styles.securityRow}>
          <ShieldCheck size={16} color="#16a34a" />
          <ThemedText style={styles.securityText}>100% Encrypted & Authenticated Order Processing</ThemedText>
        </View>
      </ScrollView>

      {/* Fixed Bottom Submit Button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <ThemedText style={styles.submitBtnText}>
              Place Order • Rs. {grandTotal.toLocaleString()}
            </ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 100,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  formGroup: {
    gap: 4,
  },
  rowGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  paymentOption: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  paymentOptionSelected: {
    borderColor: '#208AEF',
    backgroundColor: '#f0f7ff',
  },
  paymentOptionDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    opacity: 0.7,
  },
  paymentRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#208AEF',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#208AEF',
  },
  paymentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  paymentDesc: {
    fontSize: 12,
    color: '#64748b',
  },
  codWarningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  codWarningText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '600',
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#208AEF',
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  securityText: {
    fontSize: 11,
    color: '#475569',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  submitBtn: {
    backgroundColor: '#208AEF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  authNoticeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  authNoticeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  authNoticeDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: '#208AEF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
