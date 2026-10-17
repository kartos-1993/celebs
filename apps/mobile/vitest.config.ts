import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __DEV__: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@celebs/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@celebs/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
      'react-native': 'react-native-web',
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
