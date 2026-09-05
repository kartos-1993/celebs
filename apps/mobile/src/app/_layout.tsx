import { View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
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
import { clientPersister, queryClient } from '@/lib/react-query/query-client';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: clientPersister,
          maxAge: 1000 * 60 * 60 * 4,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              const rootKey = query.queryKey[0];
              if (rootKey === 'wishlist' || rootKey === 'orders' || rootKey === 'addresses') {
                return false;
              }
              // Only persist the default homefeed and categories/sdui layout for 0ms cold-start.
              // Deep product searches, filtered lists, and PDP details stay in RAM to prevent disk bloat.
              if (rootKey === 'products') {
                const isList = query.queryKey[1] === 'list';
                const filterArg = query.queryKey[2];
                const isDefaultHomeFeed =
                  isList && (!filterArg || Object.keys(filterArg as object).length === 0);
                return isDefaultHomeFeed;
              }
              return true;
            },
          },
        }}
      >
        <ThemeProvider value={DefaultTheme}>
          <AuthProvider>
            <CartProvider>
              <FlyToCartProvider>
                <CartSheetProvider>
                  <View style={{ flex: 1 }}>
                    <AnimatedSplashOverlay />
                    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen
                        name="product/[id]"
                        options={{ headerShown: false, animation: 'slide_from_right' }}
                      />
                      <Stack.Screen
                        name="category/[slug]"
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
        </ThemeProvider>
      </PersistQueryClientProvider>
    </QueryClientProvider>
  );
}
