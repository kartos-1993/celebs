import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  root: resolve(__dirname),
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@celebs/rbac': resolve(__dirname, '../../packages/rbac/src'),
      '@celebs/shared-ui': resolve(__dirname, '../../packages/shared-ui/src'),
      '@celebs/shared-types': resolve(__dirname, '../../packages/shared-types/src'),
      '@celebs/shared-utils': resolve(__dirname, '../../packages/shared-utils/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/routes/__tests__/**/*.spec.tsx'],
  },
});
