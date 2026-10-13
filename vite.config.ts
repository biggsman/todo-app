import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { configDefaults } from 'vitest/config';

const COVERAGE_THRESHOLD_PERCENT = 80;

// GitHub Pages serves the app under /todo-app/; local dev, preview and E2E stay at /.
const BASE_PATH = process.env.BASE_PATH ?? '/';

// https://vite.dev/config/
export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    // Installable PWA that keeps working offline (data already lives in localStorage).
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Todo',
        short_name: 'Todo',
        description: '브라우저에 저장되는 개인용 할 일 앱',
        lang: 'ko',
        display: 'standalone',
        theme_color: '#3a46c4',
        background_color: '#f2f2f0',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Pretendard ships many unicode-range font slices; precache them all for offline use.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Playwright specs (e2e/) run in a real browser via `npm run test:e2e`, never in Vitest.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Design Ref: §8.1 — coverage target is domain + storage + state combined
      include: ['src/domain/**', 'src/storage/**', 'src/state/**'],
      exclude: ['src/**/*.test.{ts,tsx}', 'e2e/**'],
      thresholds: {
        lines: COVERAGE_THRESHOLD_PERCENT,
        branches: COVERAGE_THRESHOLD_PERCENT,
        functions: COVERAGE_THRESHOLD_PERCENT,
        statements: COVERAGE_THRESHOLD_PERCENT,
      },
    },
  },
});
