import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { showToast } from '@/components/toast/toast';
import { Palette } from '@/constants/theme';
import { AddressFormSheet } from '@/features/addresses/components/address-form-sheet';
import { useAddresses } from '@/features/addresses/hooks/use-addresses';
import { useAuth } from '@/features/auth/context/auth-context';
import { useGoogleAuth } from '@/features/auth/hooks/use-google-auth';
import { useCart } from '@/features/cart/context/cart-context';
import { CheckoutAddressSection } from '@/features/checkout/components/checkout-address-section';
import { CheckoutBottomBar } from '@/features/checkout/components/checkout-bottom-bar';
import { CheckoutHeader } from '@/features/checkout/components/checkout-header';
import { CheckoutItemsStrip } from '@/features/checkout/components/checkout-items-strip';
import { CheckoutLoggedOut } from '@/features/checkout/components/checkout-logged-out';
import { CheckoutSummaryCard } from '@/features/checkout/components/checkout-summary-card';
import { InAppPaymentSheet } from '@/features/checkout/components/in-app-payment-sheet';
import { PaymentMethodSelector } from '@/features/checkout/components/payment-method-selector';
import {
  type CheckoutPaymentMethod,
  SelectPaymentMethodModal,
} from '@/features/checkout/components/select-payment-method-modal';
import { COD_MAX_LIMIT, FREE_SHIPPING_THRESHOLD } from '@/features/checkout/constants';
import { useCheckoutAddressForm } from '@/features/checkout/hooks/use-checkout-address-form';
import { useCheckoutMutation } from '@/features/checkout/hooks/use-checkout-mutation';
import { useCheckoutPricing } from '@/features/checkout/hooks/use-checkout-pricing';
import { styles } from '@/features/checkout/styles/checkout.styles';

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cart, subtotal, selectedItems, selectedSubtotal, refreshCart } = useCart();
  const { isLoggedIn } = useAuth();
  const { signInWithGoogle, isAuthenticating } = useGoogleAuth();
  const { placeOrder, isPlacingOrder, activePayment, handlePaymentResult } = useCheckoutMutation();

  const {
    addresses,
    loading: addressesLoading,
    refetch: refetchAddresses,
  } = useAddresses(isLoggedIn);
  const addrForm = useCheckoutAddressForm(addresses);
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('COD');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const {
    checkoutItems,
    itemsCount,
    itemsSubtotal,
    shippingFee,
    grandTotal,
    isCodDisabled,
    canPlaceOrder,
    stockWarning,
    deliveryCaption,
  } = useCheckoutPricing({
    selectedItems,
    cartItems: cart?.items,
    selectedSubtotal,
    subtotal,
    isLoggedIn,
    effectiveAddressId: addrForm.effectiveSelectedId,
  });

  // Preflight: revalidate cart truth on mount and every foreground so
  // checkout never prices or places from a stale cart.
  useEffect(() => {
    if (isLoggedIn) {
      refreshCart();
    }
  }, [isLoggedIn, refreshCart]);
  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn) {
        refreshCart();
      }
    }, [isLoggedIn, refreshCart]),
  );

  const handlePlaceOrder = () => {
    if (!addrForm.effectiveSelectedId) {
      showToast('Please add a delivery address to place your order');
      return;
    }
    if (checkoutItems.length === 0) {
      showToast('Please select items in your cart before checking out');
      return;
    }
    if (stockWarning) {
      showToast(stockWarning);
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

  return (
    <ThemedView style={styles.container}>
      <CheckoutHeader insetsTop={insets.top} itemsCount={itemsCount} onBack={() => router.back()} />

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
        {stockWarning ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginHorizontal: 16,
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              backgroundColor: '#FEF2F2',
            }}
          >
            <AlertTriangle size={18} color={Palette.danger} />
            <ThemedText style={{ flex: 1, fontSize: 13, color: Palette.danger }}>
              {stockWarning}
            </ThemedText>
          </View>
        ) : null}
        <View style={styles.sectionBand} />

        <CheckoutAddressSection
          addresses={addresses}
          selectedId={addrForm.effectiveSelectedId}
          onSelect={addrForm.setSelectedAddressId}
          onEdit={addrForm.openEdit}
          onAddNew={addrForm.openAdd}
        />
        <View style={styles.sectionBand} />

        <PaymentMethodSelector
          paymentMethod={paymentMethod}
          isCodDisabled={isCodDisabled}
          grandTotal={grandTotal}
          codMaxLimit={COD_MAX_LIMIT}
          onOpenModal={() => setPaymentModalOpen(true)}
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

      <SelectPaymentMethodModal
        visible={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        selectedMethod={paymentMethod}
        onSelectMethod={setPaymentMethod}
        subtotal={itemsSubtotal}
        grandTotal={grandTotal}
        isCodDisabled={isCodDisabled}
        codMaxLimit={COD_MAX_LIMIT}
      />

      <InAppPaymentSheet
        visible={!!activePayment}
        paymentUrl={activePayment?.paymentUrl ?? null}
        title={activePayment?.title ?? 'Payment'}
        onClose={() => handlePaymentResult('PENDING')}
        onSuccess={(status) => handlePaymentResult(status)}
      />
    </ThemedView>
  );
}
