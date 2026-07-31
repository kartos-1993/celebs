import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create an async persister using AsyncStorage (compatible with Expo Go)
export const clientPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'REACT_QUERY_OFFLINE_CACHE',
  buster: 'v2', // Increment to bust stale/empty cache
  maxAge: 1000 * 60 * 60 * 4, // 4 hours max age for persisted data
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 4, // 4 hours
      staleTime: 1000 * 30, // 30 seconds
      retry: 2,
      refetchOnWindowFocus: true, // In React Native, this triggers on app foreground
    },
  },
});
