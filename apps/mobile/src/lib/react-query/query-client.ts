import { AppState, type AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, QueryClient } from '@tanstack/react-query';

/**
 * In React Native, window.addEventListener('focus') does not exist.
 * We must connect TanStack Query's focusManager to React Native's AppState
 * so refetchOnWindowFocus works seamlessly when the customer returns to the app.
 */
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

AppState.addEventListener('change', onAppStateChange);

// Create an async persister using AsyncStorage (compatible with Expo Go)
export const clientPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'REACT_QUERY_OFFLINE_CACHE_V3', // Busts previous stale cache
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 4, // 4 hours
      staleTime: 1000 * 30, // 30 seconds
      retry: 2,
      refetchOnWindowFocus: true, // Triggers on app foreground via focusManager above
    },
  },
});
