import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env files for the current mode and expose them to the app
  const env = { ...loadEnv(mode, process.cwd(), ''), ...loadEnv(mode, __dirname, '') };
  return {
    root: __dirname,
    plugins: [react(), !process.env.VITEST && tailwindcss()].filter(Boolean),
    optimizeDeps: {
      include: ['lucide-react', 'react', 'react-dom'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@celebs/rbac': path.resolve(__dirname, '../../packages/rbac/src'),
        '@celebs/shared-ui': path.resolve(__dirname, '../../packages/shared-ui/src'),
        '@celebs/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
        '@celebs/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
    },
    build: {
      // Keep your minify setting, but make it conditional
      minify: mode === 'production' ? 'esbuild' : false,
      // Add sourcemap control from previous discussion
      sourcemap: mode !== 'production',
      // Preserve your build output directory (default)
      outDir: '../../dist/apps/web-admin',
      // Add rollup chunking from previous example
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
          },
        },
      },
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : undefined,
    },
    define: {
      // Add NODE_ENV for consistency with React ecosystem
      'process.env.NODE_ENV': JSON.stringify(mode),
      // expose only VITE_ prefixed env vars to avoid leaking system vars like PATH
      'process.env': Object.fromEntries(
        Object.entries(env)
          .filter(([k]) => k.startsWith('VITE_'))
          .map(([k, v]) => [k, JSON.stringify(v)]),
      ),
    },
  };
});
