import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create an async persister using AsyncStorage (compatible with Expo Go)
export const clientPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'REACT_QUERY_OFFLINE_CACHE',
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (default cache garbage collection time)
      staleTime: 1000 * 60 * 2, // 2 minutes (default stale time)
      retry: 2,
      refetchOnWindowFocus: true, // In React Native, this triggers on app foreground
    },
  },
});
