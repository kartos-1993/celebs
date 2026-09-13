import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { showToast } from '@/components/toast/toast';

/**
 * Cold-start target for celebs://payment-result after a wallet payment.
 * The API callback already verified server-side — this screen only relays
 * the outcome, then hands off to Orders where live polling takes over.
 */
export default function PaymentResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    status?: string;
    orderId?: string;
    gateway?: string;
  }>();

  useEffect(() => {
    const status = typeof params.status === 'string' ? params.status : '';
    if (status === 'COMPLETED') {
      showToast('Payment successful!', { type: 'success' });
    } else if (status === 'REFUNDED') {
      showToast('Payment was refunded. Contact support if unexpected.');
    } else if (status === 'FAILED') {
      showToast('Payment did not complete. Your order is saved — retry from Orders.');
    } else {
      showToast('Payment pending. Pull to refresh your order for updates.');
    }
    router.replace('/orders');
  }, [params.status, router]);

  return (
    <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ gap: 12, alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <ThemedText>Confirming your payment…</ThemedText>
      </View>
    </ThemedView>
  );
}
