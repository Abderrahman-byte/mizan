import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['mizan.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Mizan - Personal Budgeting',
        short_name: 'Mizan',
        description:
          'Personal budgeting around spending modes, a debt/loan ledger, and a savings goal.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#7b61d6',
        background_color: '#f6f4fb',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      devOptions: {
        // Serve the manifest + a dev service worker so the app is installable
        // from the dev server too (prod behavior is still the source of truth).
        enabled: true,
        suppressWarnings: true,
        navigateFallback: 'index.html',
      },
      workbox: {
        // App-shell only: precache the built assets, never touch /api.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
