import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

// Create an async persister using AsyncStorage (compatible with Expo Go)
export const clientPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'REACT_QUERY_OFFLINE_CACHE_V2', // Busts previous stale cache
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
