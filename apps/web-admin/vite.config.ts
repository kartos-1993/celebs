import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env files for the current mode and expose them to the app
  const env = loadEnv(mode, process.cwd(), '');
  return {
    root: __dirname,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs',
        '@/ui': path.resolve(__dirname, './src/components/ui'),
      },
    },
    build: {
      // Keep your minify setting, but make it conditional
      minify: mode === 'production' ? 'esbuild' : false,
      // Add sourcemap control from previous discussion
      sourcemap: mode !== 'production',
      // Preserve your build output directory (default)
      outDir: 'dist',
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
