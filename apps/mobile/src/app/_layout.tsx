import { View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { FlyToCartOverlay } from '@/components/fly-to-cart-overlay';
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
        persistOptions={{ persister: clientPersister, maxAge: 1000 * 60 * 60 * 4 }}
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
                    </Stack>
                    <FlyToCartOverlay />
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
