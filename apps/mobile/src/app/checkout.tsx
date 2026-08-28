import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, MapPin } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { showToast } from '@/components/toast/toast';
import { Palette } from '@/constants/theme';
import { AddressFormSheet } from '@/features/addresses/components/address-form-sheet';
import { AddressSelector } from '@/features/addresses/components/address-selector';
import { useAddresses } from '@/features/addresses/hooks/use-addresses';
import { useAuth } from '@/features/auth/context/auth-context';
import { useGoogleAuth } from '@/features/auth/hooks/use-google-auth';
import { useCart } from '@/features/cart/context/cart-context';
import { formatPrice } from '@/features/cart/utils/cart-selectors';
import { CheckoutBottomBar } from '@/features/checkout/components/checkout-bottom-bar';
import { CheckoutItemsStrip } from '@/features/checkout/components/checkout-items-strip';
import { CheckoutLoggedOut } from '@/features/checkout/components/checkout-logged-out';
import { CheckoutSummaryCard } from '@/features/checkout/components/checkout-summary-card';
import { PaymentMethodSelector } from '@/features/checkout/components/payment-method-selector';
import { useCheckoutAddressForm } from '@/features/checkout/hooks/use-checkout-address-form';
import { useCheckoutMutation } from '@/features/checkout/hooks/use-checkout-mutation';
import { styles } from '@/features/checkout/styles/checkout.styles';

const FREE_SHIPPING_THRESHOLD = 3000;
const SHIPPING_FEE = 150;
const COD_MAX_LIMIT = 5000;

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cart, subtotal, selectedItems, selectedSubtotal } = useCart();
  const { isLoggedIn } = useAuth();
  const { signInWithGoogle, isAuthenticating } = useGoogleAuth();
  const { placeOrder, isPlacingOrder } = useCheckoutMutation();

  const {
    addresses,
    loading: addressesLoading,
    refetch: refetchAddresses,
  } = useAddresses(isLoggedIn);
  const addrForm = useCheckoutAddressForm(addresses);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'STRIPE'>('COD');

  const checkoutItems = useMemo(
    () => (selectedItems.length > 0 ? selectedItems : cart?.items || []),
    [selectedItems, cart],
  );
  const itemsCount = checkoutItems.reduce((sum, item) => sum + item.quantity, 0);
  const itemsSubtotal = selectedItems.length > 0 ? selectedSubtotal : subtotal;
  const shippingFee =
    itemsSubtotal >= FREE_SHIPPING_THRESHOLD || itemsSubtotal === 0 ? 0 : SHIPPING_FEE;
  const grandTotal = itemsSubtotal + shippingFee;
  const isCodDisabled = grandTotal > COD_MAX_LIMIT;
  const canPlaceOrder = isLoggedIn && !!addrForm.effectiveSelectedId && checkoutItems.length > 0;

  const handlePlaceOrder = () => {
    if (!addrForm.effectiveSelectedId) {
      showToast('Please add a delivery address to place your order');
      return;
    }
    if (checkoutItems.length === 0) {
      showToast('Please select items in your cart before checking out');
      return;
    }
    placeOrder(addrForm.effectiveSelectedId, paymentMethod);
  };

  if (!isLoggedIn) {
    return (
      <CheckoutLoggedOut
        insetsTop={insets.top}
        isAuthenticating={isAuthenticating}
        onBack={() => router.back()}
        onSignInWithGoogle={signInWithGoogle}
        onSignInWithEmail={() => router.push('/me')}
      />
    );
  }

  const deliveryCaption =
    shippingFee === 0 ? 'Free delivery applied' : `Incl. Rs. ${formatPrice(shippingFee)} delivery`;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.headerIconSlot}
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          <ChevronLeft size={24} color={Palette.gray900} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Checkout ({itemsCount})</ThemedText>
        <View style={styles.headerIconSlot} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={addressesLoading} onRefresh={refetchAddresses} />
        }
      >
        <CheckoutItemsStrip items={checkoutItems} itemsCount={itemsCount} />
        <View style={styles.sectionBand} />

        <View style={styles.detailsContainer}>
          <View style={styles.sectionHeaderRow}>
            <MapPin size={16} color={Palette.gray900} />
            <ThemedText style={styles.sectionTitle}>Shipping Address</ThemedText>
          </View>
          <AddressSelector
            addresses={addresses}
            selectedId={addrForm.effectiveSelectedId}
            onSelect={addrForm.setSelectedAddressId}
            onEdit={addrForm.openEdit}
            onAddNew={addrForm.openAdd}
          />
        </View>

        <View style={styles.sectionBand} />

        <PaymentMethodSelector
          paymentMethod={paymentMethod}
          isCodDisabled={isCodDisabled}
          grandTotal={grandTotal}
          codMaxLimit={COD_MAX_LIMIT}
          onSelectPaymentMethod={setPaymentMethod}
        />

        <View style={styles.sectionBand} />

        <CheckoutSummaryCard
          itemsSubtotal={itemsSubtotal}
          shippingFee={shippingFee}
          grandTotal={grandTotal}
          freeShippingThreshold={FREE_SHIPPING_THRESHOLD}
        />
      </ScrollView>

      <CheckoutBottomBar
        insetsBottom={insets.bottom}
        deliveryCaption={deliveryCaption}
        grandTotal={grandTotal}
        canPlaceOrder={canPlaceOrder}
        placingOrder={isPlacingOrder}
        effectiveSelectedId={addrForm.effectiveSelectedId}
        onPlaceOrder={handlePlaceOrder}
      />

      <AddressFormSheet
        key={addrForm.editingAddress?.id ?? 'add-new'}
        visible={addrForm.formVisible}
        editing={addrForm.editingAddress}
        saving={addrForm.isSavingAddress}
        onClose={addrForm.closeForm}
        onSubmit={addrForm.handleSubmitAddress}
        onDelete={addrForm.handleDeleteAddress}
      />
    </ThemedView>
  );
}
