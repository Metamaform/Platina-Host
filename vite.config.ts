import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: false,
      // Allow the sandboxed live-preview host (dynamic *.e2b.app) through the
      // Vite dev middleware host check.
      allowedHosts: true,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      target: 'es2020',
      // Do not inline assets; keep public/ URLs as-is.
      assetsInlineLimit: 4096,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          // Split stable vendor libs into their own cacheable chunks so app
          // code changes don't invalidate the (large) vendor bundles.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            // lottie-web has no React dependency, so it splits cleanly on its
            // own (big, rarely changes). Everything else shares one vendor
            // chunk to avoid circular chunk references (react <-> libs).
            if (id.includes('lottie-web')) return 'lottie';
            return 'vendor';
          },
        },
      },
    },
  };
});
