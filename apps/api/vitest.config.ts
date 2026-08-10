import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables strictly from .env.test for test runs
dotenv.config({ path: resolve(__dirname, '.env.test') });

export default defineConfig({
  plugins: [tsconfigPaths()],
  root: resolve(__dirname),
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@celebs/shared-types': resolve(__dirname, '../../packages/shared-types/src'),
      '@celebs/shared-utils': resolve(__dirname, '../../packages/shared-utils/src'),
      '@celebs/rbac': resolve(__dirname, '../../packages/rbac/src'),
      'zod': resolve(__dirname, '../../node_modules/zod'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000,
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts', 'tests/**/*.spec.ts', 'tests/**/*.test.ts'],
    exclude: [],
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      BASE_PATH: process.env.BASE_PATH || '/api/v1',
      APP_ORIGIN: process.env.APP_ORIGIN || 'http://localhost:5173',
    },
  },
});
