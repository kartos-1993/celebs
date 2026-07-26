import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { queryClient, clientPersister } from '@/lib/react-query/query-client';
import { CartProvider } from '@/features/cart/context/cart-context';
import { FlyToCartProvider } from '@/features/cart/context/fly-to-cart-context';
import { FlyToCartOverlay } from '@/components/fly-to-cart-overlay';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: clientPersister }}
    >
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <CartProvider>
          <FlyToCartProvider>
            <AnimatedSplashOverlay />
            <AppTabs />
            <FlyToCartOverlay />
          </FlyToCartProvider>
        </CartProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}

