import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { defaultShouldDehydrateQuery } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { FlyToCartOverlay } from '@/components/fly-to-cart-overlay';
import { ToastHost } from '@/components/toast/toast';
import { AuthProvider } from '@/features/auth/context/auth-context';
import { CartProvider } from '@/features/cart/context/cart-context';
import { CartSheetProvider } from '@/features/cart/context/cart-sheet-context';
import { FlyToCartProvider } from '@/features/cart/context/fly-to-cart-context';
import { PushNotificationListener } from '@/features/notifications/components/push-notification-listener';
import { clientPersister, queryClient } from '@/lib/react-query/query-client';
import { AppKeyboardProvider } from '@/providers/keyboard-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isCacheRestored, setIsCacheRestored] = useState(false);

  const handleRestoreComplete = useCallback(() => {
    setIsCacheRestored(true);
  }, []);

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        onSuccess={handleRestoreComplete}
        onError={handleRestoreComplete}
        persistOptions={{
          persister: clientPersister,
          maxAge: 1000 * 60 * 60 * 4,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              // 1. Never dehydrate pending or errored queries (prevents CancelledError / rejection crash)
              if (!defaultShouldDehydrateQuery(query)) {
                return false;
              }

              const rootKey = query.queryKey[0];

              // 2. Never persist dynamic user/session transactional state to disk:
              if (
                rootKey === 'cart' ||
                rootKey === 'wishlist' ||
                rootKey === 'orders' ||
                rootKey === 'addresses' ||
                rootKey === 'reviews'
              ) {
                return false;
              }

              // 3. Only persist the default homefeed and categories/sdui layout for 0ms cold-start.
              // Deep product searches, filtered lists, and PDP details stay in RAM to prevent disk bloat.
              if (rootKey === 'products') {
                const isList = query.queryKey[1] === 'list';
                const filterArg = query.queryKey[2];
                const isDefaultHomeFeed =
                  isList && (!filterArg || Object.keys(filterArg as object).length === 0);
                return isDefaultHomeFeed;
              }

              return (
                rootKey === 'categories' || rootKey === 'sdui' || rootKey === 'storefront-config'
              );
            },
          },
        }}
      >
        <ThemeProvider value={DefaultTheme}>
          <AppKeyboardProvider>
            <AuthProvider>
              <PushNotificationListener />
              <CartProvider>
                <FlyToCartProvider>
                  <CartSheetProvider>
                    <View style={{ flex: 1 }}>
                      <AnimatedSplashOverlay isReady={isCacheRestored} />
                      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen
                          name="product/[id]"
                          getId={({ params }) => (params?.id ? String(params.id) : undefined)}
                          options={{ headerShown: false, animation: 'slide_from_right' }}
                        />
                        <Stack.Screen
                          name="category/[slug]"
                          getId={({ params }) => (params?.slug ? String(params.slug) : undefined)}
                          options={{ headerShown: false, animation: 'slide_from_right' }}
                        />
                        <Stack.Screen
                          name="checkout"
                          options={{ headerShown: false, animation: 'slide_from_bottom' }}
                        />
                        <Stack.Screen
                          name="orders"
                          options={{ headerShown: false, animation: 'slide_from_right' }}
                        />
                        <Stack.Screen
                          name="order-detail"
                          getId={({ params }) =>
                            params?.orderId ? String(params.orderId) : undefined
                          }
                          options={{ headerShown: false, animation: 'slide_from_right' }}
                        />
                        <Stack.Screen
                          name="wishlist"
                          options={{ headerShown: false, animation: 'slide_from_right' }}
                        />
                      </Stack>
                      <FlyToCartOverlay />
                      <ToastHost />
                    </View>
                  </CartSheetProvider>
                </FlyToCartProvider>
              </CartProvider>
            </AuthProvider>
          </AppKeyboardProvider>
        </ThemeProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
