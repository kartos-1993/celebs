import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

export default defineConfig({
  plugins: [tsconfigPaths()],
  root: resolve(__dirname),
  resolve: {
    alias: {
      'zod': resolve(__dirname, '../../node_modules/zod'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 30000,
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    exclude: [],
    fileParallelism: false,
    env: {
      DATABASE_URL: 'postgresql://postgres:celebs@localhost:5432/celebs-test',
      MONGODB_URI: 'mongodb://localhost:27017/celebs-product-test',
      NODE_ENV: 'test',
      BASE_PATH: '/api/v1',
      APP_ORIGIN: 'http://localhost:5173',
      JWT_SECRET: 'test_jwt_secret_key_long_enough_for_hmac',
      JWT_REFRESH_SECRET: 'test_jwt_refresh_secret_key_long_enough_for_hmac',
      SETUP_SECRET: 'celebs-superadmin-secret-2026',
    },
  },
});
