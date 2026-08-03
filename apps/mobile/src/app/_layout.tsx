import { DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { queryClient, clientPersister } from '@/lib/react-query/query-client';
import { CartProvider } from '@/features/cart/context/cart-context';
import { FlyToCartProvider } from '@/features/cart/context/fly-to-cart-context';
import { FlyToCartOverlay } from '@/components/fly-to-cart-overlay';
import { AuthProvider } from '@/features/auth/context/auth-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: clientPersister, maxAge: 1000 * 60 * 60 * 4 }}
    >
      <ThemeProvider value={DefaultTheme}>
        <AuthProvider>
          <CartProvider>
            <FlyToCartProvider>
              <View style={{ flex: 1 }}>
                <AnimatedSplashOverlay />
                <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="product/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
                  <Stack.Screen name="category/[slug]" options={{ headerShown: false, animation: 'slide_from_right' }} />
                  <Stack.Screen name="checkout" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
                  <Stack.Screen name="orders" options={{ headerShown: false, animation: 'slide_from_right' }} />
                </Stack>
                <FlyToCartOverlay />
              </View>
            </FlyToCartProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
