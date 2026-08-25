import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
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
import { AddressFormSheet } from '@/features/addresses/components/address-form-sheet';
import { AddressSelector } from '@/features/addresses/components/address-selector';
import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useUpdateAddress,
} from '@/features/addresses/hooks/use-addresses';
import type { AddressDraft, SavedAddress } from '@/features/addresses/types';
import { useAuth } from '@/features/auth/context/auth-context';
import { useGoogleAuth } from '@/features/auth/hooks/use-google-auth';
import { useCart } from '@/features/cart/context/cart-context';
import { styles } from '@/features/checkout/styles/checkout.styles';
import { formatPrice } from '@/features/cart/utils/cart-selectors';

const FREE_SHIPPING_THRESHOLD = 3000;
const SHIPPING_FEE = 150;
const COD_MAX_LIMIT = 5000;

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { cart, subtotal, selectedItems, selectedSubtotal, clearCart } = useCart();
  const { isLoggedIn } = useAuth();
  const { signInWithGoogle, isAuthenticating } = useGoogleAuth();

  const [placingOrder, setPlacingOrder] = useState<boolean>(false);

  // --- Saved addresses (Daraz-style address book) ---
  const {
    addresses,
    loading: addressesLoading,
    refetch: refetchAddresses,
  } = useAddresses(isLoggedIn);
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState<boolean>(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

  // Derived selection: falls back to the default (or first) saved address
  const effectiveSelectedId = useMemo(() => {
    if (addresses.length === 0) return null;
    if (selectedAddressId && addresses.some((a) => a.id === selectedAddressId)) {
      return selectedAddressId;
    }
    const preferred = addresses.find((a) => a.isDefault) ?? addresses[0];
    return preferred ? preferred.id : null;
  }, [addresses, selectedAddressId]);

  const openAddForm = () => {
    setEditingAddress(null);
    setFormVisible(true);
  };

  const openEditForm = (address: SavedAddress) => {
    setEditingAddress(address);
    setFormVisible(true);
  };

  const handleSubmitAddress = async (draft: AddressDraft) => {
    try {
      if (editingAddress) {
        await updateAddress.mutateAsync({ addressId: editingAddress.id, draft });
      } else {
        await createAddress.mutateAsync(draft);
      }
      setFormVisible(false);
      setEditingAddress(null);
    } catch (err: unknown) {
      Alert.alert(
        'Could Not Save Address',
        (err as { message?: string })?.message || 'Please check your details and try again.',
      );
    }
  };

  const handleDeleteAddress = (addressId: string) => {
    Alert.alert('Delete Address', 'Remove this saved address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteAddress.mutate(addressId, {
            onSuccess: () => {
              setFormVisible(false);
              setEditingAddress(null);
            },
            onError: (err: Error) => {
              Alert.alert(
                'Cannot Delete Address',
                err.message || 'This address may be linked to past orders. Try editing it instead.',
              );
            },
          });
        },
      },
    ]);
  };

  // --- Order totals ---
  const checkoutItems = useMemo(
    () => (selectedItems.length > 0 ? selectedItems : cart?.items || []),
    [selectedItems, cart],
  );
  const itemsCount = checkoutItems.reduce((sum, item) => sum + item.quantity, 0);
  const itemsSubtotal = selectedItems.length > 0 ? selectedSubtotal : subtotal;

  const shippingFee =
    itemsSubtotal >= FREE_SHIPPING_THRESHOLD || itemsSubtotal === 0 ? 0 : SHIPPING_FEE;
  const grandTotal = itemsSubtotal + shippingFee;

  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'STRIPE'>('COD');
  const isCodDisabled = grandTotal > COD_MAX_LIMIT;

  const canPlaceOrder = isLoggedIn && !!effectiveSelectedId && checkoutItems.length > 0;

  const handlePlaceOrder = async () => {
    if (!isLoggedIn) {
      Alert.alert('Login Required', 'Please sign in to complete your checkout.');
      return;
    }

    if (checkoutItems.length === 0) {
      Alert.alert('No Items Selected', 'Please select items in your cart before checking out.');
      return;
    }

    if (!effectiveSelectedId) {
      Alert.alert('Delivery Address', 'Please add a delivery address to place your order.');
      return;
    }

    if (paymentMethod === 'COD' && isCodDisabled) {
      Alert.alert(
        'COD Limit Exceeded',
        `Cash on Delivery is limited to max NPR ${COD_MAX_LIMIT.toLocaleString()}. Please select Stripe card payment.`,
      );
      return;
    }

    setPlacingOrder(true);

    try {
      const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Server builds the order from the authenticated user's server-side cart
      // and the saved address reference — no client item list is sent.
      const response = await apiClient.post<{
        message?: string;
        data?: { order?: { orderNumber?: string } };
      }>('/orders/checkout', {
        idempotencyKey,
        addressId: effectiveSelectedId,
        paymentMethod,
      });
      const placedOrderNumber = response.data?.data?.order?.orderNumber;

      await clearCart();
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });

      Alert.alert(
        'Order Placed!',
        placedOrderNumber
          ? `Order ${placedOrderNumber} confirmed. Track it live in My Orders.`
          : 'Thank you for your order. We are processing it and will update you soon.',
        [
          {
            text: 'Track Order',
            onPress: () => router.replace('/orders'),
          },
          { text: 'OK', onPress: () => router.replace('/(tabs)') },
        ],
      );
    } catch (err: unknown) {
      Alert.alert(
        'Order Failed',
        (err as { message?: string })?.message ||
          'Something went wrong while placing your order. Please try again.',
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  /* ---------------- LOGGED OUT ---------------- */
  if (!isLoggedIn) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.headerBar, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.headerIconSlot}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={24} color={Palette.gray900} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Checkout</ThemedText>
          <View style={styles.headerIconSlot} />
        </View>

        <View style={styles.authNoticeContainer}>
          <Lock size={48} color={Palette.gray900} strokeWidth={1.6} />
          <ThemedText style={styles.authNoticeTitle}>Sign In to Proceed to Checkout</ThemedText>
          <ThemedText style={styles.authNoticeDesc}>
            Your items are saved safely in your cart. Sign in with Google to pick your delivery
            address and complete your order.
          </ThemedText>

          <TouchableOpacity
            style={styles.googleBtn}
            onPress={signInWithGoogle}
            disabled={placingOrder || isAuthenticating}
            accessibilityRole="button"
            accessibilityLabel="Sign in with Google"
          >
            {(placingOrder || isAuthenticating) && <ActivityIndicator color={Palette.black} />}
            {!placingOrder && !isAuthenticating && (
              <>
                <View style={styles.googleGLogo}>
                  <ThemedText style={styles.googleGText}>G</ThemedText>
                </View>
                <ThemedText style={styles.googleBtnText}>Sign In with Google</ThemedText>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/me')}>
            <ThemedText style={styles.secondaryBtnText}>Sign In with Email / Password</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  /* ---------------- LOGGED IN ---------------- */
  const paymentRows: Array<{
    key: 'COD' | 'STRIPE' | 'WALLET';
    name: string;
    desc: string;
    disabled?: boolean;
    comingSoonTag?: string;
  }> = [
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

  const deliveryCaption =
    shippingFee === 0 ? 'Free delivery applied' : `Incl. Rs. ${formatPrice(shippingFee)} delivery`;

  return (
    <ThemedView style={styles.container}>
      {/* Solid header */}
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.headerIconSlot}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
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
        {/* Items strip */}
        <View style={styles.detailsContainer}>
          <View style={styles.itemsHeaderRow}>
            <ThemedText style={styles.itemsCountText}>
              {itemsCount} item{itemsCount === 1 ? '' : 's'}
            </ThemedText>
          </View>
          <View style={styles.itemsRow}>
            {checkoutItems.map((item) => (
              <View key={item.id} style={styles.itemThumbWrap}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.itemThumb}
                  resizeMode="cover"
                  accessible={true}
                  accessibilityLabel={item.productName}
                />
                <View style={styles.itemQtyBadge}>
                  <ThemedText style={styles.itemQtyText}>×{item.quantity}</ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionBand} />

        {/* Shipping address */}
        <View style={styles.detailsContainer}>
          <View style={styles.sectionHeaderRow}>
            <MapPin size={16} color={Palette.gray900} />
            <ThemedText style={styles.sectionTitle}>Shipping Address</ThemedText>
          </View>

          {addressesLoading && addresses.length === 0 ? (
            <ThemedText style={styles.addrHint}>Loading saved addresses…</ThemedText>
          ) : addresses.length === 0 ? (
            <ThemedText style={styles.addrHint}>
              No saved address yet. Add one below — you can save Home, Office and more for next
              time.
            </ThemedText>
          ) : null}

          <AddressSelector
            addresses={addresses}
            selectedId={effectiveSelectedId}
            onSelect={setSelectedAddressId}
            onEdit={openEditForm}
            onAddNew={openAddForm}
          />
        </View>

        <View style={styles.sectionBand} />

        {/* Payment method */}
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
                    setPaymentMethod(row.key);
                    if (row.key === 'COD' && isCodDisabled) {
                      Alert.alert(
                        'COD Unavailable',
                        `Cash on Delivery is limited to NPR ${COD_MAX_LIMIT.toLocaleString()}. This total exceeds the limit.`,
                      );
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
                COD limited to max NPR {COD_MAX_LIMIT.toLocaleString()}. Total is NPR{' '}
                {grandTotal.toLocaleString()}.
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.sectionBand} />

        {/* Summary */}
        <View style={styles.detailsContainer}>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
            <ThemedText style={styles.summaryValue}>Rs. {formatPrice(itemsSubtotal)}</ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Delivery</ThemedText>
            {shippingFee === 0 ? (
              <ThemedText style={styles.freeShippingText}>FREE</ThemedText>
            ) : (
              <ThemedText style={styles.summaryValue}>Rs. {formatPrice(shippingFee)}</ThemedText>
            )}
          </View>

          {shippingFee > 0 && (
            <ThemedText style={styles.summaryLabel}>
              Add Rs. {FREE_SHIPPING_THRESHOLD - itemsSubtotal} more for free delivery
            </ThemedText>
          )}

          <View style={styles.divider} />

          <View style={[styles.summaryRow, styles.totalRowGap]}>
            <ThemedText style={styles.totalLabel}>Grand Total</ThemedText>
            <ThemedText style={styles.totalValue}>Rs. {formatPrice(grandTotal)}</ThemedText>
          </View>
        </View>

        <View style={styles.securityRow}>
          <ShieldCheck size={14} color={Palette.success} />
          <ThemedText style={styles.securityText}>
            100% encrypted & authenticated order processing
          </ThemedText>
        </View>
      </ScrollView>

      {/* Bottom action bar — normal flow sibling of ScrollView */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.xs }]}>
        <View style={styles.barTotalsGroup}>
          <ThemedText style={styles.barCaption}>{deliveryCaption}</ThemedText>
          <ThemedText style={styles.barTotalPrice}>Rs. {formatPrice(grandTotal)}</ThemedText>
        </View>
        <TouchableOpacity
          style={[styles.placeBtn, (!canPlaceOrder || placingOrder) && styles.placeBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={!canPlaceOrder || placingOrder}
          activeOpacity={0.85}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={
            effectiveSelectedId
              ? `Place order, total Rs. ${formatPrice(grandTotal)}`
              : 'Add a delivery address to place order'
          }
        >
          {placingOrder ? (
            <ActivityIndicator color={Palette.white} />
          ) : (
            <ThemedText style={styles.placeBtnText}>
              Place Order · Rs. {formatPrice(grandTotal)}
            </ThemedText>
          )}
        </TouchableOpacity>
      </View>

      {/* Address add/edit sheet — keyed so form state resets between add/edit */}
      <AddressFormSheet
        key={editingAddress?.id ?? 'add-new'}
        visible={formVisible}
        editing={editingAddress}
        saving={createAddress.isPending || updateAddress.isPending || deleteAddress.isPending}
        onClose={() => {
          setFormVisible(false);
          setEditingAddress(null);
        }}
        onSubmit={handleSubmitAddress}
        onDelete={handleDeleteAddress}
      />
    </ThemedView>
  );
}
