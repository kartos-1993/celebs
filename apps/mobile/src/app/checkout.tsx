import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ChevronLeft,
  CreditCard,
  Lock,
  MapPin,
  ShieldCheck,
} from 'lucide-react-native';

import { apiClient } from '@/api/client';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/auth-context';
import { useGoogleAuth } from '@/features/auth/hooks/use-google-auth';
import { useCart } from '@/features/cart/context/cart-context';
import { styles } from '@/features/checkout/styles/checkout.styles';

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cart, subtotal, selectedItems, selectedSubtotal, clearCart } = useCart();
  const { user, isLoggedIn } = useAuth();
  const { signInWithGoogle, isAuthenticating } = useGoogleAuth();

  const [loading, setLoading] = useState<boolean>(false);

  const checkoutItems = useMemo(
    () => (selectedItems.length > 0 ? selectedItems : cart?.items || []),
    [selectedItems, cart],
  );
  const itemsSubtotal = selectedItems.length > 0 ? selectedSubtotal : subtotal;

  // Address State (Daraz Nepal Structure)
  const [fullName, setFullName] = useState<string>(user?.name || 'Ram Bahadur Shrestha');
  const [phone, setPhone] = useState<string>('9841234567');
  const [province, setProvince] = useState<string>('Bagmati');
  const [district, setDistrict] = useState<string>('Kathmandu');
  const [cityArea, setCityArea] = useState<string>('New Baneshwor');
  const [streetAddress, setStreetAddress] = useState<string>('House #42, Near Civil Hospital');

  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'STRIPE' | 'ESEWA' | 'KHALTI'>('COD');

  const shippingFee = itemsSubtotal > 3000 ? 0 : 150;
  const grandTotal = itemsSubtotal + shippingFee;
  const isCodDisabled = grandTotal > 5000;

  const handlePlaceOrder = async () => {
    if (!isLoggedIn) {
      Alert.alert('Login Required', 'Please sign in to complete your checkout.');
      return;
    }

    if (checkoutItems.length === 0) {
      Alert.alert('No Items Selected', 'Please select items in your cart before checking out.');
      return;
    }

    if (!fullName || !phone || !cityArea || !streetAddress) {
      Alert.alert('Incomplete Address', 'Please fill in your delivery name, phone, and city area.');
      return;
    }

    if (paymentMethod === 'COD' && isCodDisabled) {
      Alert.alert(
        'COD Limit Exceeded',
        'Cash on Delivery is limited to max NPR 5,000. Please select Stripe or digital wallet.',
      );
      return;
    }

    setLoading(true);

    try {
      // Live API Call to backend checkout endpoint
      const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const payload = {
        idempotencyKey,
        shippingAddress: {
          fullName,
          phone,
          province,
          district,
          cityArea,
          streetAddress,
        },
        paymentMethod,
      };

      // Server builds the order from the authenticated user's server-side cart
      // (guest carts are merged into it on login) — no client item list is sent.
      const response = await apiClient.post<{
        message: string;
        data: { order?: { orderNumber?: string } };
      }>('/orders/checkout', payload);
      const placedOrderNumber = response.data?.data?.order?.orderNumber;

      await clearCart();

      Alert.alert(
        'Order Placed!',
        placedOrderNumber
          ? `Order ${placedOrderNumber} confirmed. Thank you for your purchase.`
          : 'Thank you for your order. We are processing it and will update you soon.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(tabs)');
            },
          },
        ],
      );
    } catch (err: unknown) {
      Alert.alert(
        'Order Failed',
        (err as { message?: string })?.message ||
          'Something went wrong while placing your order. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={Palette.gray900} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Sign In to Checkout</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.authNoticeContainer}>
          <Lock size={48} color={Palette.brand} />
          <ThemedText style={styles.authNoticeTitle}>Sign In to Proceed to Checkout</ThemedText>
          <ThemedText style={styles.authNoticeDesc}>
            Your items are saved safely in your cart. Sign in with Google to enter your Kathmandu
            delivery address and complete order.
          </ThemedText>

          {/* Real Google Sign-In Button */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={signInWithGoogle}
            disabled={loading || isAuthenticating}
          >
            {loading || isAuthenticating ? (
              <ActivityIndicator color={Palette.black} />
            ) : (
              <>
                <View style={styles.googleGLogo}>
                  <ThemedText style={styles.googleGText}>G</ThemedText>
                </View>
                <ThemedText style={styles.googleBtnText}>Sign In with Google</ThemedText>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/me')}>
            <ThemedText style={styles.secondaryBtnText}>Sign In with Email / Password</ThemedText>
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
          <ChevronLeft size={24} color={Palette.gray900} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Checkout</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Shipping Address Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color={Palette.brand} />
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
            <CreditCard size={20} color={Palette.brand} />
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
              <View
                style={[styles.radioOuter, paymentMethod === 'COD' && styles.radioOuterSelected]}
              >
                {paymentMethod === 'COD' && <View style={styles.radioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.paymentName}>Cash on Delivery (COD)</ThemedText>
                <ThemedText style={styles.paymentDesc}>
                  Pay cash when order arrives at your doorstep
                </ThemedText>
              </View>
            </View>

            {isCodDisabled && (
              <View style={styles.codWarningBadge}>
                <AlertCircle size={14} color={Palette.warning} />
                <ThemedText style={styles.codWarningText}>
                  COD limited to max NPR 5,000. Total is NPR {grandTotal.toLocaleString()}.
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>

          {/* Stripe Option */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'STRIPE' && styles.paymentOptionSelected,
            ]}
            onPress={() => setPaymentMethod('STRIPE')}
            activeOpacity={0.8}
          >
            <View style={styles.paymentRadioRow}>
              <View
                style={[styles.radioOuter, paymentMethod === 'STRIPE' && styles.radioOuterSelected]}
              >
                {paymentMethod === 'STRIPE' && <View style={styles.radioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.paymentName}>Stripe (Credit / Debit Card)</ThemedText>
                <ThemedText style={styles.paymentDesc}>
                  Ideal for international cards & Nepalis buying from abroad
                </ThemedText>
              </View>
            </View>
          </TouchableOpacity>

          {/* eSewa / Khalti — disabled until the real gateway integration ships;
              the API rejects these methods with 400 (see order.validator.ts) */}
          <TouchableOpacity
            style={[styles.paymentOption, styles.paymentOptionDisabled]}
            activeOpacity={1}
            disabled
          >
            <View style={styles.paymentRadioRow}>
              <View style={styles.radioOuter} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.paymentName}>
                  eSewa / Khalti Digital Wallet (Coming Soon)
                </ThemedText>
                <ThemedText style={styles.paymentDesc}>
                  Instant payment via Nepal digital wallet app
                </ThemedText>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Price Summary Breakdown */}
        <View style={styles.sectionCard}>
          <ThemedText style={styles.sectionTitle}>Order Summary</ThemedText>

          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
            <ThemedText style={styles.summaryValue}>
              Rs. {itemsSubtotal.toLocaleString()}
            </ThemedText>
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
          <ShieldCheck size={16} color={Palette.success} />
          <ThemedText style={styles.securityText}>
            100% Encrypted & Authenticated Order Processing
          </ThemedText>
        </View>
      </ScrollView>

      {/* Fixed Bottom Submit Button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Palette.white} />
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
